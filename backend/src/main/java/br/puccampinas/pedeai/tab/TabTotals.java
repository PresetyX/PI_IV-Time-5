package br.puccampinas.pedeai.tab;

import java.util.List;
import java.util.Set;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

@Component
public class TabTotals {

    static final Set<String> IGNORED_STATUS = Set.of("CANCELLED", "CANCELED", "REMOVED");

    private final MongoTemplate mongo;

    public TabTotals(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public Totals recalculate(ObjectId storeId, ObjectId tabId) {
        int subtotal = 0;
        Query orders = Query.query(Criteria.where("storeId").is(storeId).and("tabId").is(tabId)
                .and("status").nin(IGNORED_STATUS));
        for (Document order : mongo.find(orders, Document.class, "order")) {
            for (Document item : activeItems(order)) {
                subtotal += number(item, "quantity") * number(item, "unitPriceCents");
            }
        }
        Document store = mongo.findById(storeId, Document.class, "store");
        int feeBasisPoints = store == null ? 0 : number(store, "serviceFeeBasisPoints");
        int serviceFee = Math.round(subtotal * feeBasisPoints / 10000f);
        Document tab = mongo.findById(tabId, Document.class, "tab");
        int discount = tab == null ? 0 : number(tab, "discountCents");
        int total = Math.max(0, subtotal + serviceFee - discount);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(tabId).and("storeId").is(storeId)),
                new Update().set("subtotalCents", subtotal).set("serviceFeeCents", serviceFee).set("totalCents", total),
                "tab");
        return new Totals(subtotal, serviceFee, discount, total);
    }

    static List<Document> activeItems(Document order) {
        return order.getList("items", Document.class, List.of()).stream()
                .filter(item -> !IGNORED_STATUS.contains(item.getString("status")))
                .toList();
    }

    static int number(Document doc, String field) {
        Object value = doc.get(field);
        return value instanceof Number number ? number.intValue() : 0;
    }

    public record Totals(int subtotalCents, int serviceFeeCents, int discountCents, int totalCents) {
    }
}
