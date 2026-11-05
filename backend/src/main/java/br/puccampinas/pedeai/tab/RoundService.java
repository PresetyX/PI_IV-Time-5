package br.puccampinas.pedeai.tab;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.session.GuestSessionRepository;
import br.puccampinas.pedeai.table.TableRepository;

@Service
public class RoundService {

    static final int MAX_SUGGESTIONS = 3;
    private static final List<String> OPEN_STATUS = List.of("OPEN", "AWAITING_PAYMENT");

    private final TabService tabService;
    private final ProductRepository productRepository;
    private final GuestSessionRepository sessionRepository;
    private final TableRepository tableRepository;
    private final MongoTemplate mongo;

    public RoundService(TabService tabService, ProductRepository productRepository,
            GuestSessionRepository sessionRepository, TableRepository tableRepository, MongoTemplate mongo) {
        this.tabService = tabService;
        this.productRepository = productRepository;
        this.sessionRepository = sessionRepository;
        this.tableRepository = tableRepository;
        this.mongo = mongo;
    }

    public RoundResponse roundOfMyTab(AuthenticatedUser guest) {
        Tab tab = tabService.requireMyTab(guest);
        Document lastOrder = mongo.findOne(Query.query(Criteria.where("storeId").is(tab.storeId())
                .and("tabId").is(tab.id()).and("status").nin(TabTotals.IGNORED_STATUS))
                .with(Sort.by(Sort.Direction.DESC, "createdAt")), Document.class, "order");
        List<Document> lastItems = lastOrder == null ? List.of() : TabTotals.activeItems(lastOrder);
        List<Document> tableOrders = ordersOnTheTable(tab);

        Set<ObjectId> productIds = new HashSet<>();
        lastItems.forEach(item -> productIds.add(item.getObjectId("productId")));
        tableOrders.forEach(order -> TabTotals.activeItems(order)
                .forEach(item -> productIds.add(item.getObjectId("productId"))));
        Map<ObjectId, Product> products = productRepository.findAllById(productIds).stream()
                .filter(product -> product.storeId().equals(tab.storeId()))
                .collect(Collectors.toMap(Product::id, Function.identity()));

        List<RoundResponse.RoundItem> items = new ArrayList<>();
        for (Document item : lastItems) {
            Product product = products.get(item.getObjectId("productId"));
            items.add(new RoundResponse.RoundItem(item.getObjectId("productId").toHexString(),
                    product == null ? item.getString("nameSnapshot") : product.name(), item.getString("note"),
                    TabTotals.number(item, "quantity"),
                    product == null ? TabTotals.number(item, "unitPriceCents") : product.priceCents(),
                    product != null && product.available()));
        }

        Set<ObjectId> repeated = lastItems.stream().map(item -> item.getObjectId("productId"))
                .collect(Collectors.toSet());
        int tableNumber = tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        return new RoundResponse(tab.customerName(), tableNumber,
                lastOrder == null ? null : TabTotals.number(lastOrder, "number"),
                lastOrder == null ? null : lastOrder.getDate("createdAt").toInstant(), items,
                suggestions(tableOrders, products, repeated, guest.userId()));
    }

    /** Pedidos de todas as comandas abertas na mesa, do mais novo para o mais antigo. */
    private List<Document> ordersOnTheTable(Tab tab) {
        List<ObjectId> tabIds = mongo.find(Query.query(Criteria.where("storeId").is(tab.storeId())
                .and("tableId").is(tab.tableId()).and("status").in(OPEN_STATUS)), Document.class, "tab")
                .stream().map(found -> found.getObjectId("_id")).toList();
        return mongo.find(Query.query(Criteria.where("storeId").is(tab.storeId()).and("tabId").in(tabIds)
                .and("status").nin(TabTotals.IGNORED_STATUS))
                .with(Sort.by(Sort.Direction.DESC, "createdAt")), Document.class, "order");
    }

    /** O que outras pessoas da mesa pediram e não está na rodada, ainda disponível, do pedido mais recente. */
    private List<RoundResponse.Suggestion> suggestions(List<Document> tableOrders, Map<ObjectId, Product> products,
            Set<ObjectId> repeated, ObjectId me) {
        Set<ObjectId> seen = new LinkedHashSet<>(repeated);
        List<Document> picked = new ArrayList<>();
        List<Document> pickedOrders = new ArrayList<>();
        for (Document order : tableOrders) {
            for (Document item : TabTotals.activeItems(order)) {
                ObjectId productId = item.getObjectId("productId");
                Product product = products.get(productId);
                if (picked.size() == MAX_SUGGESTIONS || me.equals(item.getObjectId("placedBySessionId"))
                        || product == null || !product.available() || !seen.add(productId)) {
                    continue;
                }
                picked.add(item);
                pickedOrders.add(order);
            }
        }

        Set<ObjectId> sessionIds = picked.stream().map(item -> item.getObjectId("placedBySessionId"))
                .filter(id -> id != null).collect(Collectors.toSet());
        Map<ObjectId, String> names = sessionRepository.findAllById(sessionIds).stream()
                .filter(session -> session.name() != null)
                .collect(Collectors.toMap(GuestSession::id, GuestSession::name));

        List<RoundResponse.Suggestion> suggestions = new ArrayList<>();
        for (int i = 0; i < picked.size(); i++) {
            Document item = picked.get(i);
            Product product = products.get(item.getObjectId("productId"));
            suggestions.add(new RoundResponse.Suggestion(product.id().toHexString(), product.name(),
                    product.priceCents(), names.get(item.getObjectId("placedBySessionId")),
                    pickedOrders.get(i).getDate("createdAt").toInstant()));
        }
        return suggestions;
    }
}
