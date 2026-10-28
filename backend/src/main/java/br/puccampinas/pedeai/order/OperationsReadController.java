package br.puccampinas.pedeai.order;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operations")
public class OperationsReadController {
    private final MongoTemplate mongo;
    public OperationsReadController(MongoTemplate mongo) { this.mongo = mongo; }
    private List<Document> read(ObjectId storeId, String collection, Criteria extra, String... fields) {
        Query query = Query.query(Criteria.where("storeId").is(storeId));
        if (extra != null) query.addCriteria(extra);
        query.fields().include(fields);
        return mongo.find(query, Document.class, collection);
    }
    private Object json(Object value) {
        if (value instanceof ObjectId id) return id.toHexString();
        if (value instanceof Date date) return date.toInstant().toString();
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, item) -> result.put(key.equals("_id") ? "id" : key.toString(), json(item)));
            return result;
        }
        if (value instanceof List<?> list) return list.stream().map(this::json).toList();
        return value;
    }
    @GetMapping("/workspace")
    public ResponseEntity<?> workspace(@AuthenticationPrincipal AuthenticatedUser user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "unauthorized", "message", "Entre novamente."));
        if (!Set.of("OWNER", "MANAGER", "KITCHEN", "WAITER").contains(user.role()))
            return ResponseEntity.status(403).body(Map.of("error", "forbidden", "message", "Perfil sem acesso."));
        ObjectId storeId = user.storeId();
        Document store = mongo.findOne(Query.query(Criteria.where("_id").is(storeId)), Document.class, "store");
        if (store == null) return ResponseEntity.status(404).body(Map.of("error", "not_found", "message", "Estabelecimento não encontrado."));
        boolean kitchen = user.role().equals("KITCHEN");
        List<Document> tabs = read(storeId, "tab", Criteria.where("status").ne("CLOSED"),
            "tableId", "mode", "customerName", "status", "subtotalCents", "serviceFeeCents", "totalCents", "openedAt", "waiterCalls", "pickupTicket");
        List<ObjectId> tabIds = tabs.stream().map(tab -> tab.getObjectId("_id")).toList();
        Criteria ordersCriteria = kitchen ? Criteria.where("status").in("RECEIVED", "PREPARING", "READY")
            : new Criteria().orOperator(Criteria.where("tabId").in(tabIds), Criteria.where("status").in("RECEIVED", "PREPARING", "READY"));
        List<Document> orders = read(storeId, "order", ordersCriteria,
            "tabId", "tableId", "number", "status", "items", "totalCents", "createdAt", "readyAt", "deliveredAt", "statusHistory");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("store", new Document("name", store.getString("name")).append("logoUrl", store.getString("logoUrl"))
            .append("pausedUntil", store.getDate("pausedUntil")).append("pausedScopes", store.get("pausedScopes")));
        body.put("role", user.role());
        body.put("tables", read(storeId, "table", Criteria.where("active").is(true), "number", "nickname"));
        body.put("tabs", tabs);
        body.put("orders", orders);
        body.put("waitlist", kitchen ? List.of() : read(storeId, "waitlist", Criteria.where("status").in("WAITING", "CALLED"), "name", "partySize", "number", "status", "createdAt"));
        body.put("serverTime", new Date());
        return ResponseEntity.ok(json(body));
    }
}
