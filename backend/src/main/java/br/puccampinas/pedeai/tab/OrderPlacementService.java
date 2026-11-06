package br.puccampinas.pedeai.tab;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.OrderRejectedException;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.socket.OrderValidationClient;
import br.puccampinas.pedeai.store.OpeningStatus;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;
import br.puccampinas.pedeai.store.StoreService;

@Service
public class OrderPlacementService {

    /** [Mateus · Card 5] Pedido de balcão enviado, esperando o pagamento no caixa; não aparece na cozinha. */
    public static final String AWAITING_PAYMENT = "AWAITING_PAYMENT";

    private final TabService tabService;
    private final ProductRepository productRepository;
    private final StoreService storeService;
    private final MongoTemplate mongo;
    private final Clock clock;
    private final TabTotals tabTotals;
    private final OrderValidationClient orderValidationClient;

    public OrderPlacementService(TabService tabService, ProductRepository productRepository,
            StoreService storeService, MongoTemplate mongo, Clock clock, TabTotals tabTotals,
            OrderValidationClient orderValidationClient) {
        this.tabService = tabService;
        this.productRepository = productRepository;
        this.storeService = storeService;
        this.mongo = mongo;
        this.clock = clock;
        this.tabTotals = tabTotals;
        this.orderValidationClient = orderValidationClient;
    }

    /**
     * Cria o pedido na comanda do cliente. Ordem: comanda, loja aceitando pedidos, produtos e disponibilidade,
     * opções, total, maioridade (se houver bebida alcoólica), validação no server pelo socket e só então número
     * do dia e gravação. Se o server recusar ou não responder em 3 segundos, nada é gravado e nenhum número é
     * consumido.
     *
     * <p>Cada item grava {@code unitPriceCents} já com as opções somadas (o preço que o cliente paga por unidade),
     * {@code basePriceCents} com o preço do produto sem opções e {@code options} com o acréscimo de cada uma.
     * {@code ageConfirmed} fica {@code true} no pedido quando ele passou pela confirmação de idade.
     */
    public PlacedOrder place(AuthenticatedUser guest, PlaceOrderRequest request) {
        Tab tab = tabService.requireMyTab(guest);
        OpeningStatus status = storeService.statusOf(tab.storeId())
                .filter(OpeningStatus::acceptingOrders)
                .orElseThrow(() -> new OrderRejectedException(HttpStatus.CONFLICT,
                        OrderRejectedException.STORE_CLOSED, "A casa não está aceitando pedidos agora."));

        List<ObjectId> ids = request.items().stream().map(item -> objectId(item.productId())).toList();
        Map<ObjectId, Product> products = productRepository.findAllById(ids).stream()
                .filter(product -> product.storeId().equals(tab.storeId()))
                .collect(Collectors.toMap(Product::id, Function.identity()));

        Instant now = clock.instant();
        ObjectId sessionId = guest.userId();
        // Balcão: o pedido espera o pagamento no caixa antes de entrar na fila da cozinha.
        boolean counter = TabService.MODE_COUNTER.equals(tab.mode());
        String initialStatus = counter ? AWAITING_PAYMENT : "RECEIVED";
        int total = 0;
        List<Document> items = new ArrayList<>();
        List<OrderValidationClient.Item> toValidate = new ArrayList<>();
        for (PlaceOrderRequest.Item item : request.items()) {
            Product product = products.get(new ObjectId(item.productId()));
            if (product == null) {
                throw new OrderRejectedException(HttpStatus.CONFLICT, OrderRejectedException.ITEM_UNAVAILABLE,
                        "Um item do carrinho saiu do cardápio.");
            }
            if (!product.available()) {
                throw new OrderRejectedException(HttpStatus.CONFLICT, OrderRejectedException.ITEM_UNAVAILABLE,
                        product.name() + " acabou.");
            }
            OrderOptions.Resolved options = OrderOptions.resolve(product, item.optionsOrEmpty());
            int unitPrice = product.priceCents() + options.deltaSumCents();
            if (unitPrice < 0) {
                throw new InvalidRequestException(product.name() + " ficou com preço negativo com essas opções");
            }
            String note = item.note() == null ? "" : item.note().trim();
            total += unitPrice * item.quantity();
            items.add(new Document("productId", product.id())
                    .append("nameSnapshot", product.name())
                    .append("unitPriceCents", unitPrice)
                    .append("basePriceCents", product.priceCents())
                    .append("quantity", item.quantity())
                    .append("note", note)
                    .append("options", options.documents())
                    .append("status", initialStatus)
                    .append("placedByType", "CUSTOMER")
                    .append("placedBySessionId", sessionId));
            toValidate.add(new OrderValidationClient.Item(product.priceCents(), item.quantity(), note,
                    options.deltasCents()));
        }

        boolean hasAlcohol = request.items().stream()
                .map(item -> products.get(new ObjectId(item.productId())))
                .anyMatch(product -> Boolean.TRUE.equals(product.isAlcoholic()));
        if (hasAlcohol && !request.isAgeConfirmed()) {
            throw new OrderRejectedException(HttpStatus.UNPROCESSABLE_ENTITY,
                    OrderRejectedException.AGE_CONFIRMATION_REQUIRED,
                    "Seu pedido tem bebida alcoólica. Confirme que você tem 18 anos ou mais.");
        }

        orderValidationClient.validate(new OrderValidationClient.OrderValidation(toValidate,
                request.expectedTotalCents(), total, status.opensAt(), status.lastOrderAt(),
                LocalTime.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE))));

        ObjectId orderId = new ObjectId();
        int number = nextNumber(tab.storeId(), "ORDER");
        Integer pickupTicket = counter ? pickupTicket(tab) : null;
        Document order = new Document("_id", orderId)
                .append("storeId", tab.storeId())
                .append("tabId", tab.id())
                .append("number", number)
                .append("status", initialStatus)
                .append("ageConfirmed", hasAlcohol)
                .append("items", items)
                .append("totalCents", total)
                .append("createdAt", Date.from(now));
        // O validador de order aceita tableId ausente, mas não null: pedido de balcão (sem mesa) vai sem o campo.
        if (tab.tableId() != null) {
            order.append("tableId", tab.tableId());
        }
        if (pickupTicket != null) {
            order.append("pickupTicket", pickupTicket);
        }
        mongo.insert(order, "order");
        mongo.insert(new Document("storeId", tab.storeId()).append("orderId", orderId)
                .append("type", "CREATED").append("to", initialStatus).append("at", Date.from(now)), "orderEvent");
        tabTotals.recalculate(tab.storeId(), tab.id());
        return new PlacedOrder(orderId.toHexString(), number, initialStatus, total, pickupTicket);
    }

    /**
     * Senha do balcão: a da comanda, se já tiver; senão a próxima do dia, gravada na comanda só se ninguém gravou
     * antes (dois pedidos ao mesmo tempo ficam com a mesma senha).
     */
    private int pickupTicket(Tab tab) {
        Query ofTab = Query.query(Criteria.where("_id").is(tab.id()).and("storeId").is(tab.storeId()));
        Document current = mongo.findOne(ofTab, Document.class, "tab");
        if (current != null && current.get("pickupTicket") instanceof Number existing) {
            return existing.intValue();
        }
        int next = nextNumber(tab.storeId(), "PICKUP");
        Document updated = mongo.findAndModify(
                Query.query(Criteria.where("_id").is(tab.id()).and("storeId").is(tab.storeId())
                        .and("pickupTicket").exists(false)),
                new Update().set("pickupTicket", next), FindAndModifyOptions.options().returnNew(true),
                Document.class, "tab");
        if (updated != null) {
            return next;
        }
        Document winner = mongo.findOne(ofTab, Document.class, "tab");
        return winner != null && winner.get("pickupTicket") instanceof Number number ? number.intValue() : next;
    }

    private int nextNumber(ObjectId storeId, String type) {
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        String key = storeId.toHexString() + ":" + today + ":" + type;
        Document counter = mongo.findAndModify(Query.query(Criteria.where("_id").is(key)),
                new Update().inc("seq", 1), FindAndModifyOptions.options().upsert(true).returnNew(true),
                Document.class, "sequence");
        return counter.get("seq", Number.class).intValue();
    }

    private static ObjectId objectId(String value) {
        if (!ObjectId.isValid(value)) {
            throw new InvalidRequestException("Invalid product id: " + value);
        }
        return new ObjectId(value);
    }

    /** {@code pickupTicket}: senha do balcão; ausente no pedido de mesa. */
    public record PlacedOrder(String id, int number, String status, int totalCents, Integer pickupTicket) {
    }
}
