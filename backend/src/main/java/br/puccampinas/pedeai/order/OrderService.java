package br.puccampinas.pedeai.order;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.auth.JwtService;
import br.puccampinas.pedeai.common.ServerUnavailableException;
import br.puccampinas.pedeai.menu.Option;
import br.puccampinas.pedeai.menu.OptionGroup;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.order.Order.OrderItem;
import br.puccampinas.pedeai.order.Order.OrderOption;
import br.puccampinas.pedeai.socket.SocketClient;
import br.puccampinas.pedeai.socket.SocketResponse;
import br.puccampinas.pedeai.store.OpeningStatus;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;
import br.puccampinas.pedeai.store.OpeningStatusCalculator.OrderingWindow;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;

@Service
public class OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderService.class);

    private static final String TAB_COLLECTION = "tab";
    private static final String SEQUENCE_COLLECTION = "sequence";
    private static final String TAB_OPEN = "OPEN";
    private static final String PLACED_BY_CUSTOMER = "CUSTOMER";
    private static final String PLACED_BY_STAFF = "STAFF";

    private final OrderRepository orderRepository;
    private final OrderEventRepository eventRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final OpeningStatusCalculator openingStatusCalculator;
    private final SocketClient socketClient;
    private final MongoTemplate mongo;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public OrderService(OrderRepository orderRepository, OrderEventRepository eventRepository,
            ProductRepository productRepository, StoreRepository storeRepository,
            OpeningStatusCalculator openingStatusCalculator, SocketClient socketClient, MongoTemplate mongo,
            ObjectMapper objectMapper, Clock clock) {
        this.orderRepository = orderRepository;
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.openingStatusCalculator = openingStatusCalculator;
        this.socketClient = socketClient;
        this.mongo = mongo;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public Order create(AuthenticatedUser user, CreateOrderRequest request) {
        Store store = storeRepository.findById(user.storeId()).filter(Store::active)
                .orElseThrow(() -> reject(HttpStatus.NOT_FOUND, "not_found", "Estabelecimento não encontrado."));
        Document tab = loadOpenTab(user, request.tabId());

        OrderingWindow window = requireOrderingWindow(store);

        Map<ObjectId, Product> products = loadProducts(store.id(), request.items());
        requireAvailable(request.items(), products);
        List<OrderItem> items = buildItems(user, request.items(), products);
        boolean alcoholic = containsAlcohol(products.values());
        boolean ageConfirmed = Boolean.TRUE.equals(request.ageConfirmed());
        if (alcoholic && !ageConfirmed) {
            throw reject(HttpStatus.BAD_REQUEST, "age_confirmation_required",
                    "Para pedir bebida alcoólica, confirme que você tem 18 anos ou mais.");
        }

        int computedCents = total(items);
        // Nada é gravado sem o server confirmar: qualquer falha ou silêncio aqui encerra o pedido.
        validateWithServer(items, request.totalCents(), computedCents, window);

        Instant now = clock.instant();
        Order order = orderRepository.save(new Order(
                null,
                store.id(),
                tab.getObjectId("_id"),
                tab.getObjectId("tableId"),
                nextNumber(store.id(), now),
                Order.STATUS_RECEIVED,
                alcoholic && ageConfirmed,
                items,
                computedCents,
                now));
        recordCreation(order, user);
        return order;
    }

    // ------------------------------------------------------------------ comanda

    private Document loadOpenTab(AuthenticatedUser user, String tabId) {
        if (!ObjectId.isValid(tabId)) {
            throw reject(HttpStatus.BAD_REQUEST, "validation", "Comanda inválida.");
        }
        Document tab = mongo.findOne(Query.query(Criteria.where("storeId").is(user.storeId())
                .and("_id").is(new ObjectId(tabId))), Document.class, TAB_COLLECTION);
        if (tab == null) {
            throw reject(HttpStatus.NOT_FOUND, "not_found", "Comanda não encontrada.");
        }
        if (isGuest(user) && !belongsTo(tab, user.userId())) {
            throw reject(HttpStatus.FORBIDDEN, "forbidden", "Esta comanda não é sua.");
        }
        if (!TAB_OPEN.equals(tab.getString("status"))) {
            throw reject(HttpStatus.CONFLICT, "tab_not_open", "Esta comanda não aceita novos pedidos.");
        }
        return tab;
    }

    private static boolean isGuest(AuthenticatedUser user) {
        return JwtService.ROLE_GUEST.equals(user.role());
    }

    /** O dono da comanda e os participantes que não foram removidos podem pedir nela. */
    private static boolean belongsTo(Document tab, ObjectId sessionId) {
        if (sessionId.equals(tab.getObjectId("ownerSessionId"))) {
            return true;
        }
        return tab.getList("participants", Document.class, List.of()).stream()
                .anyMatch(p -> sessionId.equals(p.getObjectId("sessionId")) && p.get("removedAt") == null);
    }

    // ------------------------------------------------------------------ horário

    private OrderingWindow requireOrderingWindow(Store store) {
        OpeningStatus status = openingStatusCalculator.calculate(store);
        if (status.paused()) {
            throw reject(HttpStatus.CONFLICT, "store_paused",
                    "A casa pausou os pedidos por um momento. Tente de novo em instantes.");
        }
        if (!status.open() || !status.acceptingOrders()) {
            throw reject(HttpStatus.CONFLICT, "store_closed", "A casa não está aceitando pedidos agora.");
        }
        return openingStatusCalculator.orderingWindow(store)
                .orElseThrow(() -> reject(HttpStatus.CONFLICT, "store_closed",
                        "A casa não está aceitando pedidos agora."));
    }

    // ------------------------------------------------------------------ produtos e itens

    private Map<ObjectId, Product> loadProducts(ObjectId storeId, List<CreateOrderRequest.Item> requested) {
        Set<ObjectId> ids = new HashSet<>();
        for (CreateOrderRequest.Item item : requested) {
            if (!ObjectId.isValid(item.productId())) {
                throw reject(HttpStatus.BAD_REQUEST, "validation", "Produto inválido no carrinho.");
            }
            ids.add(new ObjectId(item.productId()));
        }
        return productRepository.findByStoreIdAndIdIn(storeId, ids).stream()
                .collect(Collectors.toMap(Product::id, Function.identity()));
    }

    /** A disponibilidade é conferida de novo aqui: o cardápio que o cliente viu pode ter mudado. */
    private void requireAvailable(List<CreateOrderRequest.Item> requested, Map<ObjectId, Product> products) {
        Set<String> unavailable = new LinkedHashSet<>();
        for (CreateOrderRequest.Item item : requested) {
            Product product = products.get(new ObjectId(item.productId()));
            if (product == null) {
                unavailable.add("item que saiu do cardápio");
            } else if (!product.available()) {
                unavailable.add(product.name());
            }
        }
        if (!unavailable.isEmpty()) {
            throw reject(HttpStatus.CONFLICT, "item_unavailable",
                    "Esgotado agora: " + String.join(", ", unavailable) + ". Retire do carrinho para continuar.");
        }
    }

    private List<OrderItem> buildItems(AuthenticatedUser user, List<CreateOrderRequest.Item> requested,
            Map<ObjectId, Product> products) {
        boolean guest = isGuest(user);
        List<OrderItem> items = new ArrayList<>();
        for (CreateOrderRequest.Item item : requested) {
            Product product = products.get(new ObjectId(item.productId()));
            List<OrderOption> options = resolveOptions(product, item.options());
            String note = item.note() == null || item.note().isBlank() ? null : item.note().trim();
            items.add(new OrderItem(
                    product.id(),
                    product.name(),
                    product.priceCents(),
                    item.quantity(),
                    note,
                    options,
                    Order.STATUS_RECEIVED,
                    guest ? PLACED_BY_CUSTOMER : PLACED_BY_STAFF,
                    guest ? null : user.userId(),
                    guest ? user.userId() : null));
            if (unitCents(items.get(items.size() - 1)) < 0) {
                throw reject(HttpStatus.BAD_REQUEST, "validation", "Opções inválidas para " + product.name() + ".");
            }
        }
        return items;
    }

    /**
     * Converte o que o cliente escolheu (grupo e rótulo) nas opções do cardápio atual, com o acréscimo vindo
     * do banco. Confere duplicadas, grupos obrigatórios e mínimo e máximo de cada grupo.
     */
    private List<OrderOption> resolveOptions(Product product, List<CreateOrderRequest.Choice> choices) {
        List<CreateOrderRequest.Choice> picked = choices == null ? List.of() : choices;
        List<OptionGroup> groups = product.optionGroups() == null ? List.of() : product.optionGroups();

        Set<String> groupNames = groups.stream().map(OptionGroup::name).collect(Collectors.toSet());
        for (CreateOrderRequest.Choice choice : picked) {
            if (!groupNames.contains(choice.group())) {
                throw invalidOption(product);
            }
        }

        List<OrderOption> resolved = new ArrayList<>();
        for (OptionGroup group : groups) {
            List<OrderOption> inGroup = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            for (CreateOrderRequest.Choice choice : picked) {
                if (!choice.group().equals(group.name())) {
                    continue;
                }
                Option option = group.options() == null ? null : group.options().stream()
                        .filter(candidate -> candidate.label().equals(choice.label())).findFirst().orElse(null);
                if (option == null || !seen.add(choice.label())) {
                    throw invalidOption(product);
                }
                inGroup.add(new OrderOption(group.name(), option.label(), option.deltaCents()));
            }
            int min = group.required() ? Math.max(group.min(), 1) : group.min();
            int max = group.max() > 0 ? group.max() : Integer.MAX_VALUE;
            if (inGroup.size() < min || inGroup.size() > max) {
                throw reject(HttpStatus.BAD_REQUEST, "validation",
                        "Revise a escolha de \"" + group.name() + "\" em " + product.name() + ".");
            }
            resolved.addAll(inGroup);
        }
        return resolved;
    }

    private static boolean containsAlcohol(Iterable<Product> products) {
        for (Product product : products) {
            if (Boolean.TRUE.equals(product.isAlcoholic())) {
                return true;
            }
        }
        return false;
    }

    private static long unitCents(OrderItem item) {
        long unit = item.unitPriceCents();
        for (OrderOption option : item.options()) {
            unit += option.deltaCents();
        }
        return unit;
    }

    private static int total(List<OrderItem> items) {
        long sum = 0;
        for (OrderItem item : items) {
            sum += unitCents(item) * item.quantity();
        }
        return Math.toIntExact(sum);
    }

    // ------------------------------------------------------------------ server de validação

    private void validateWithServer(List<OrderItem> items, int clientTotalCents, int computedCents,
            OrderingWindow window) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("items", itemsJson(items));
        params.put("totalCents", Integer.toString(clientTotalCents));
        params.put("computedCents", Integer.toString(computedCents));
        params.put("openAt", window.opensAt());
        params.put("closeAt", window.lastOrderAt());
        params.put("now", window.now());

        SocketResponse response;
        try {
            response = socketClient.send("VALIDATE_ORDER", params);
        } catch (ServerUnavailableException e) {
            LOGGER.warn("Order validation unavailable: {}", e.getMessage());
            throw reject(HttpStatus.SERVICE_UNAVAILABLE, "server_unavailable",
                    "Não conseguimos validar seu pedido agora. Nada foi enviado; tente de novo.");
        }

        if (!response.ok()) {
            throw refusalFor(response);
        }
        if (!confirmsTotal(response.body(), computedCents)) {
            LOGGER.error("Unexpected VALIDATE_ORDER answer: {}", response.body());
            throw reject(HttpStatus.BAD_GATEWAY, "upstream_error",
                    "Não conseguimos validar seu pedido agora. Nada foi enviado; tente de novo.");
        }
    }

    private String itemsJson(List<OrderItem> items) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (OrderItem item : items) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("unitPriceCents", item.unitPriceCents());
            row.put("quantity", item.quantity());
            if (item.note() != null) {
                row.put("note", item.note());
            }
            if (!item.options().isEmpty()) {
                row.put("options", item.options().stream().map(option -> Map.of("deltaCents", option.deltaCents()))
                        .toList());
            }
            payload.add(row);
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize order items", e);
        }
    }

    private boolean confirmsTotal(String body, int computedCents) {
        try {
            JsonNode json = objectMapper.readTree(body);
            return json.path("valid").asBoolean(false) && json.path("totalCents").asLong(-1) == computedCents;
        } catch (JsonProcessingException e) {
            return false;
        }
    }

    private OrderRejectedException refusalFor(SocketResponse response) {
        String code = response.code() == null ? "" : response.code();
        LOGGER.info("Order refused by server: {} {}", code, response.message());
        return switch (code) {
            case "TOTAL_MISMATCH" -> reject(HttpStatus.CONFLICT, "total_mismatch",
                    "Os valores mudaram desde que você montou o carrinho. Revise o pedido e envie de novo.");
            case "CLOSED_HOURS" -> reject(HttpStatus.CONFLICT, "store_closed",
                    "A casa não está aceitando pedidos agora.");
            case "INVALID_PARAMS" -> reject(HttpStatus.BAD_REQUEST, "validation",
                    "Há itens inválidos no pedido. Revise o carrinho.");
            default -> reject(HttpStatus.BAD_GATEWAY, "upstream_error",
                    "Não conseguimos validar seu pedido agora. Nada foi enviado; tente de novo.");
        };
    }

    // ------------------------------------------------------------------ gravação

    /** Número do dia, por casa. O dia segue o fuso da casa, para a contagem não zerar no meio do jantar. */
    private int nextNumber(ObjectId storeId, Instant now) {
        LocalDate day = LocalDate.ofInstant(now, OpeningStatusCalculator.STORE_ZONE);
        String key = storeId.toHexString() + ":" + day + ":order";
        Document sequence = mongo.findAndModify(
                Query.query(Criteria.where("_id").is(key)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().upsert(true).returnNew(true),
                Document.class,
                SEQUENCE_COLLECTION);
        return sequence.getInteger("seq");
    }

    /** O pedido já está gravado e na fila: falha no histórico não pode devolver erro ao cliente e gerar duplicata. */
    private void recordCreation(Order order, AuthenticatedUser user) {
        try {
            eventRepository.save(OrderEvent.created(order, isGuest(user) ? null : user.userId()));
        } catch (DataAccessException e) {
            LOGGER.error("Order {} saved but its CREATED event was not", order.id(), e);
        }
    }

    private static OrderRejectedException reject(HttpStatus status, String code, String message) {
        return new OrderRejectedException(status, code, message);
    }

    private static OrderRejectedException invalidOption(Product product) {
        return reject(HttpStatus.BAD_REQUEST, "validation", "Opção inválida para " + product.name() + ".");
    }
}
