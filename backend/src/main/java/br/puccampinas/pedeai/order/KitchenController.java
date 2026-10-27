package br.puccampinas.pedeai.order;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operations")
public class KitchenController {
    private final MongoTemplate mongo;
    private static final Set<String> ACTIVE = Set.of("RECEIVED", "PREPARING", "READY");
    private static final Map<String, String> NEXT = Map.of(
        "RECEIVED", "PREPARING", "PREPARING", "READY", "READY", "DELIVERED");

    public KitchenController(MongoTemplate mongo) { this.mongo = mongo; }
    public record StatusRequest(@NotBlank String expectedStatus, @NotBlank String status) {}

    private void authorize(AuthenticatedUser user, boolean delivery) {
        if (user == null) throw new OperationException(401, "unauthorized", "Entre novamente.");
        Set<String> roles = delivery ? Set.of("OWNER", "MANAGER", "WAITER")
            : Set.of("OWNER", "MANAGER", "KITCHEN");
        if (!roles.contains(user.role()))
            throw new OperationException(403, "forbidden", "Seu perfil não permite esta operação.");
    }
    private ObjectId objectId(String value) {
        if (!ObjectId.isValid(value)) throw new OperationException(400, "validation", "Identificador inválido.");
        return new ObjectId(value);
    }
    private Query scoped(AuthenticatedUser user, ObjectId id) {
        return Query.query(Criteria.where("storeId").is(user.storeId()).and("_id").is(id));
    }

    @GetMapping("/queue")
    public List<Map<String, Object>> queue(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "ALL") String mode) {
        authorize(user, false);
        if (!status.equals("ALL") && !ACTIVE.contains(status))
            throw new OperationException(400, "validation", "Filtro de status inválido.");
        if (!Set.of("ALL", "TABLE", "COUNTER").contains(mode))
            throw new OperationException(400, "validation", "Filtro de origem inválido.");
        Criteria criteria = Criteria.where("storeId").is(user.storeId()).and("status")
            .in(status.equals("ALL") ? ACTIVE : Set.of(status));
        if (!mode.equals("ALL")) {
            List<ObjectId> tabs = mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())
                .and("mode").is(mode)), Document.class, "tab").stream()
                .map(d -> d.getObjectId("_id")).toList();
            criteria = criteria.and("tabId").in(tabs);
        }
        List<Document> orders = mongo.find(Query.query(criteria)
            .with(Sort.by(Sort.Direction.ASC, "createdAt")), Document.class, "order");
        Map<ObjectId, Document> tabs = new HashMap<>();
        Map<ObjectId, Document> tables = new HashMap<>();
        Set<ObjectId> tabIds = new HashSet<>();
        Set<ObjectId> tableIds = new HashSet<>();
        orders.forEach(d -> { if (d.get("tabId") instanceof ObjectId id) tabIds.add(id); });
        if (!tabIds.isEmpty()) mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())
            .and("_id").in(tabIds)), Document.class, "tab").forEach(d -> {
                tabs.put(d.getObjectId("_id"), d);
                if (d.get("tableId") instanceof ObjectId id) tableIds.add(id);
            });
        orders.forEach(d -> { if (d.get("tableId") instanceof ObjectId id) tableIds.add(id); });
        if (!tableIds.isEmpty()) mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())
            .and("_id").in(tableIds)), Document.class, "table")
            .forEach(d -> tables.put(d.getObjectId("_id"), d));
        return orders.stream().map(d -> view(d, tabs.get(d.get("tabId")), tables)).toList();
    }

    @GetMapping("/orders/{id}")
    public Map<String, Object> detail(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String id) {
        authorize(user, false);
        Document order = mongo.findOne(scoped(user, objectId(id)), Document.class, "order");
        if (order == null) throw new OperationException(404, "not_found", "Pedido não encontrado.");
        Document tab = order.get("tabId") instanceof ObjectId tabId
            ? mongo.findOne(scoped(user, tabId), Document.class, "tab") : null;
        ObjectId tableId = order.get("tableId") instanceof ObjectId tid ? tid
            : tab != null && tab.get("tableId") instanceof ObjectId tid ? tid : null;
        Document table = tableId == null ? null : mongo.findOne(scoped(user, tableId), Document.class, "table");
        return view(order, tab, table == null ? Map.of() : Map.of(tableId, table));
    }

    @PatchMapping("/orders/{id}/status")
    public Map<String, String> changeStatus(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id, @Valid @RequestBody StatusRequest request) {
        authorize(user, request.status().equals("DELIVERED"));
        if (!request.status().equals(NEXT.get(request.expectedStatus())))
            throw new OperationException(409, "invalid_transition", "Transição de status não permitida.");
        ObjectId orderId = objectId(id);
        Instant now = Instant.now();
        Query query = scoped(user, orderId).addCriteria(Criteria.where("status").is(request.expectedStatus()));
        Document event = new Document("from", request.expectedStatus()).append("to", request.status())
            .append("byUserId", user.userId()).append("at", Date.from(now));
        Update update = new Update().set("status", request.status()).set("updatedAt", Date.from(now))
            .push("statusHistory", event)
            .set("items.$[active].status", request.status())
            .filterArray(Criteria.where("active.status").nin("REMOVED", "CANCELLED"));
        if (request.status().equals("READY")) update.set("readyAt", Date.from(now));
        if (request.status().equals("DELIVERED")) update.set("deliveredAt", Date.from(now));
        Document changed = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
            Document.class, "order");
        if (changed == null) {
            if (!mongo.exists(scoped(user, orderId), "order"))
                throw new OperationException(404, "not_found", "Pedido não encontrado.");
            throw new OperationException(409, "status_conflict", "O pedido mudou em outra tela. Atualize a fila.");
        }
        return Map.of("id", id, "status", request.status());
    }

    private Map<String, Object> view(Document order, Document tab, Map<ObjectId, Document> tables) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", order.getObjectId("_id").toHexString());
        body.put("number", order.get("number"));
        body.put("status", order.getString("status"));
        body.put("createdAt", order.getDate("createdAt").toInstant().toString());
        body.put("readyAt", order.getDate("readyAt") == null ? null : order.getDate("readyAt").toInstant().toString());
        body.put("mode", tab == null ? "UNKNOWN" : tab.getString("mode"));
        body.put("customerName", tab == null ? null : tab.getString("customerName"));
        Object tableId = order.get("tableId") != null ? order.get("tableId") : tab == null ? null : tab.get("tableId");
        Document table = tables.get(tableId);
        body.put("tableNumber", table == null ? null : table.get("number"));
        body.put("totalCents", order.get("totalCents"));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Document item : order.getList("items", Document.class, List.of())) {
            if (Set.of("REMOVED", "CANCELLED").contains(item.getString("status"))) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", item.getString("nameSnapshot"));
            row.put("quantity", item.get("quantity"));
            row.put("note", item.getString("note"));
            row.put("unitPriceCents", item.get("unitPriceCents"));
            row.put("options", item.getList("options", Document.class, List.of()).stream()
                .map(option -> option.getString("label")).toList());
            items.add(row);
        }
        body.put("items", items);
        return body;
    }

    static class OperationException extends RuntimeException {
        final int status;
        final String code;
        OperationException(int status, String code, String message) {
            super(message); this.status = status; this.code = code;
        }
    }
    @ExceptionHandler(OperationException.class)
    public ResponseEntity<Map<String, String>> handleOperation(OperationException e) {
        return ResponseEntity.status(e.status).body(Map.of("error", e.code, "message", e.getMessage()));
    }
}
