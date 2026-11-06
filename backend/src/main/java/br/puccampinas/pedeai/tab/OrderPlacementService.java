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
import br.puccampinas.pedeai.common.ConflictException;
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
     * total, maioridade (se houver bebida alcoólica), validação no server pelo socket e só então número do dia e
     * gravação. {@code ageConfirmed} fica {@code true} no pedido quando ele passou pela confirmação de idade. Se o server recusar ou não
     * responder em 3 segundos, nada é gravado e nenhum número é consumido.
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
        int total = 0;
        List<Document> items = new ArrayList<>();
        List<OrderValidationClient.Item> toValidate = new ArrayList<>();
        for (PlaceOrderRequest.Item item : request.items()) {
            Product product = products.get(new ObjectId(item.productId()));
            if (product == null) {
                throw new InvalidRequestException("Product not found: " + item.productId());
            }
            if (!product.available()) {
                throw new ConflictException(product.name() + " is not available now");
            }
            String note = item.note() == null ? "" : item.note().trim();
            total += product.priceCents() * item.quantity();
            items.add(new Document("productId", product.id())
                    .append("nameSnapshot", product.name())
                    .append("unitPriceCents", product.priceCents())
                    .append("quantity", item.quantity())
                    .append("note", note)
                    .append("options", List.of())
                    .append("status", "RECEIVED")
                    .append("placedByType", "CUSTOMER")
                    .append("placedBySessionId", sessionId));
            toValidate.add(new OrderValidationClient.Item(product.priceCents(), item.quantity(), note, List.of()));
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
        int number = nextNumber(tab.storeId());
        mongo.insert(new Document("_id", orderId)
                .append("storeId", tab.storeId())
                .append("tabId", tab.id())
                .append("tableId", tab.tableId())
                .append("number", number)
                .append("status", "RECEIVED")
                .append("ageConfirmed", hasAlcohol)
                .append("items", items)
                .append("totalCents", total)
                .append("createdAt", Date.from(now)), "order");
        mongo.insert(new Document("storeId", tab.storeId()).append("orderId", orderId)
                .append("type", "CREATED").append("at", Date.from(now)), "orderEvent");
        tabTotals.recalculate(tab.storeId(), tab.id());
        return new PlacedOrder(orderId.toHexString(), number, "RECEIVED", total);
    }

    private int nextNumber(ObjectId storeId) {
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        String key = storeId.toHexString() + ":" + today + ":ORDER";
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

    public record PlacedOrder(String id, int number, String status, int totalCents) {
    }
}
