package br.puccampinas.pedeai.order;

import java.time.Clock;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.tab.TabTotals;

/**
 * [Mateus · Card 4] Cancelar pedido com motivo e entrega parcial. Toda mudança grava um documento em
 * {@code orderEvent} e também em {@code statusHistory} do pedido, que é o que o acompanhamento do cliente lê.
 */
@Service
public class OrderOperationService {

    static final Set<String> CANCEL_ROLES = Set.of("OWNER", "MANAGER", "KITCHEN");
    static final Set<String> DELIVERY_ROLES = Set.of("OWNER", "MANAGER", "WAITER");
    static final Set<String> CANCELLABLE = Set.of("RECEIVED", "PREPARING");
    static final Set<String> CANCEL_REASONS = Set.of("GAVE_UP", "WRONG_ORDER", "OUT_OF_STOCK", "DUPLICATE");
    private static final Set<String> INACTIVE_ITEMS = Set.of("REMOVED", "CANCELLED", "CANCELED");

    private final MongoTemplate mongo;
    private final TabTotals tabTotals;
    private final Clock clock;

    public OrderOperationService(MongoTemplate mongo, TabTotals tabTotals, Clock clock) {
        this.mongo = mongo;
        this.tabTotals = tabTotals;
        this.clock = clock;
    }

    public record Result(String id, String status) {
    }

    /** Cancela o pedido inteiro. Só antes de ficar pronto; a comanda é recalculada sem ele. */
    public Result cancel(AuthenticatedUser user, String orderId, String reason, String note) {
        requireRole(user, CANCEL_ROLES);
        if (!CANCEL_REASONS.contains(reason)) {
            throw new InvalidRequestException("Motivo de cancelamento inválido");
        }
        ObjectId id = objectId(orderId);
        Date now = Date.from(clock.instant());
        String cleanNote = note == null ? "" : note.trim();

        Query query = scoped(user, id).addCriteria(Criteria.where("status").in(CANCELLABLE));
        Update update = new Update()
                .set("status", "CANCELLED")
                .set("cancelReason", reason)
                .set("cancelledByUserId", user.userId())
                .set("cancelledAt", now)
                .set("updatedAt", now)
                .set("items.$[active].status", "CANCELLED")
                .filterArray(Criteria.where("active.status").nin(INACTIVE_ITEMS));
        if (!cleanNote.isEmpty()) {
            update.set("cancelNote", cleanNote);
        }
        Document before = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(false),
                Document.class, "order");
        if (before == null) {
            Document current = mongo.findOne(scoped(user, id), Document.class, "order");
            if (current == null) {
                throw new ResourceNotFoundException("Pedido não encontrado.");
            }
            throw new ConflictException("Só dá para cancelar pedido que ainda não ficou pronto.");
        }

        String from = before.getString("status");
        mongo.updateFirst(scoped(user, id), new Update().push("statusHistory",
                new Document("from", from).append("to", "CANCELLED").append("byUserId", user.userId())
                        .append("at", now)), "order");
        Document event = new Document("storeId", user.storeId()).append("orderId", id).append("type", "CANCELLED")
                .append("from", from).append("to", "CANCELLED").append("byUserId", user.userId())
                .append("reason", reason).append("at", now);
        if (!cleanNote.isEmpty()) {
            event.append("note", cleanNote);
        }
        mongo.insert(event, "orderEvent");
        if (before.get("tabId") instanceof ObjectId tabId) {
            tabTotals.recalculate(user.storeId(), tabId);
        }
        return new Result(orderId, "CANCELLED");
    }

    /**
     * Entrega parte dos itens de um pedido pronto, pela posição na lista {@code items}. Quando não sobra item
     * ativo por entregar, o pedido inteiro vira {@code DELIVERED}.
     */
    public Result deliver(AuthenticatedUser user, String orderId, List<Integer> itemIndexes) {
        requireRole(user, DELIVERY_ROLES);
        if (itemIndexes == null || itemIndexes.isEmpty()) {
            throw new InvalidRequestException("Escolha pelo menos um item para entregar");
        }
        ObjectId id = objectId(orderId);
        Document order = mongo.findOne(scoped(user, id), Document.class, "order");
        if (order == null) {
            throw new ResourceNotFoundException("Pedido não encontrado.");
        }
        if (!"READY".equals(order.getString("status"))) {
            throw new ConflictException("Só dá para entregar pedido pronto. Atualize a tela.");
        }

        List<Document> items = order.getList("items", Document.class, List.of());
        Set<Integer> chosen = new TreeSet<>(itemIndexes);
        for (int index : chosen) {
            if (index < 0 || index >= items.size()) {
                throw new InvalidRequestException("Item inexistente no pedido: " + index);
            }
            String status = items.get(index).getString("status");
            if (INACTIVE_ITEMS.contains(status) || "DELIVERED".equals(status)) {
                throw new ConflictException("Um dos itens já foi entregue ou cancelado. Atualize a tela.");
            }
        }
        boolean allDelivered = true;
        for (int i = 0; i < items.size(); i++) {
            String status = items.get(i).getString("status");
            if (!chosen.contains(i) && !INACTIVE_ITEMS.contains(status) && !"DELIVERED".equals(status)) {
                allDelivered = false;
            }
        }

        Date now = Date.from(clock.instant());
        // Só grava se o pedido e os itens escolhidos ainda estão como foram lidos (outra tela pode ter mudado).
        Query query = scoped(user, id).addCriteria(Criteria.where("status").is("READY"));
        Update update = new Update().set("updatedAt", now);
        for (int index : chosen) {
            query.addCriteria(Criteria.where("items." + index + ".status").is(items.get(index).getString("status")));
            update.set("items." + index + ".status", "DELIVERED").set("items." + index + ".deliveredAt", now);
        }
        if (allDelivered) {
            update.set("status", "DELIVERED").set("deliveredAt", now).push("statusHistory",
                    new Document("from", "READY").append("to", "DELIVERED").append("byUserId", user.userId())
                            .append("at", now));
        }
        Document changed = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
                Document.class, "order");
        if (changed == null) {
            throw new ConflictException("O pedido mudou em outra tela. Atualize a lista.");
        }

        mongo.insert(new Document("storeId", user.storeId()).append("orderId", id).append("type", "ITEMS_DELIVERED")
                .append("itemIndexes", List.copyOf(chosen)).append("byUserId", user.userId()).append("at", now),
                "orderEvent");
        if (allDelivered) {
            mongo.insert(new Document("storeId", user.storeId()).append("orderId", id).append("type", "STATUS_CHANGED")
                    .append("from", "READY").append("to", "DELIVERED").append("byUserId", user.userId())
                    .append("at", now), "orderEvent");
        }
        return new Result(orderId, allDelivered ? "DELIVERED" : "READY");
    }

    private static void requireRole(AuthenticatedUser user, Set<String> roles) {
        if (user == null || !roles.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    private static Query scoped(AuthenticatedUser user, ObjectId id) {
        return Query.query(Criteria.where("storeId").is(user.storeId()).and("_id").is(id));
    }

    private static ObjectId objectId(String value) {
        if (!ObjectId.isValid(value)) {
            throw new InvalidRequestException("Identificador inválido.");
        }
        return new ObjectId(value);
    }
}
