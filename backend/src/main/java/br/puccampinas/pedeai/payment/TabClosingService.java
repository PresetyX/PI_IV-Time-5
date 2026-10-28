package br.puccampinas.pedeai.payment;

import java.time.Clock;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

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

@Service
public class TabClosingService {

    static final Set<String> METHODS = Set.of("PIX_MANUAL", "CASH", "CARD_DEBIT", "CARD_CREDIT");
    private static final Set<String> ROLES = Set.of("OWNER", "MANAGER", "WAITER");
    private static final Set<String> IGNORED_STATUS = Set.of("CANCELLED", "CANCELED", "REMOVED");

    private final MongoTemplate mongo;
    private final TabTotals tabTotals;
    private final Clock clock;

    public TabClosingService(MongoTemplate mongo, TabTotals tabTotals, Clock clock) {
        this.mongo = mongo;
        this.tabTotals = tabTotals;
        this.clock = clock;
    }

    public Map<String, Object> close(AuthenticatedUser user, String tabId, String method) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite fechar contas.");
        }
        if (!METHODS.contains(method)) {
            throw new InvalidRequestException("method must be PIX_MANUAL, CASH, CARD_DEBIT or CARD_CREDIT");
        }
        if (!ObjectId.isValid(tabId)) {
            throw new InvalidRequestException("Invalid tab id");
        }
        ObjectId id = new ObjectId(tabId);
        Query open = Query.query(Criteria.where("_id").is(id).and("storeId").is(user.storeId())
                .and("status").in("OPEN", "AWAITING_PAYMENT"));
        if (!mongo.exists(open, "tab")) {
            if (mongo.exists(Query.query(Criteria.where("_id").is(id).and("storeId").is(user.storeId())), "tab")) {
                throw new ConflictException("Tab is already closed");
            }
            throw new ResourceNotFoundException("Tab not found");
        }

        TabTotals.Totals totals = tabTotals.recalculate(user.storeId(), id);
        Date now = Date.from(clock.instant());
        Document closed = mongo.findAndModify(open,
                new Update().set("status", "CLOSED").set("paidCents", totals.totalCents()).set("splitMode", "SINGLE")
                        .set("closedAt", now).set("closedByUserId", user.userId()),
                FindAndModifyOptions.options().returnNew(true), Document.class, "tab");
        if (closed == null) {
            throw new ConflictException("Tab is already closed");
        }
        if (totals.totalCents() > 0) {
            mongo.insert(new Document("storeId", user.storeId()).append("tabId", id).append("method", method)
                    .append("amountCents", totals.totalCents()).append("payerName", closed.getString("customerName"))
                    .append("isPartial", false).append("registeredByUserId", user.userId()).append("createdAt", now),
                    "payment");
        }
        confirmCommissions(user.storeId(), id, now);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", tabId);
        body.put("status", "CLOSED");
        body.put("method", method);
        body.put("totalCents", totals.totalCents());
        return body;
    }

    private void confirmCommissions(ObjectId storeId, ObjectId tabId, Date now) {
        Document store = mongo.findById(storeId, Document.class, "store");
        int rate = store == null || !(store.get("commissionBasisPoints") instanceof Number n) ? 0 : n.intValue();
        Query orders = Query.query(Criteria.where("storeId").is(storeId).and("tabId").is(tabId)
                .and("status").nin(IGNORED_STATUS));
        for (Document order : mongo.find(orders, Document.class, "order")) {
            Map<ObjectId, Integer> baseByUser = new LinkedHashMap<>();
            for (Document item : order.getList("items", Document.class, java.util.List.of())) {
                if (IGNORED_STATUS.contains(item.getString("status")) || !"STAFF".equals(item.getString("placedByType"))
                        || !(item.get("placedByUserId") instanceof ObjectId userId)) {
                    continue;
                }
                int value = ((Number) item.get("quantity")).intValue() * ((Number) item.get("unitPriceCents")).intValue();
                baseByUser.merge(userId, value, Integer::sum);
            }
            ObjectId orderId = order.getObjectId("_id");
            baseByUser.forEach((userId, base) -> {
                Query existing = Query.query(Criteria.where("storeId").is(storeId).and("orderId").is(orderId)
                        .and("userId").is(userId));
                mongo.upsert(existing, new Update().setOnInsert("tabId", tabId).setOnInsert("createdAt", now)
                        .set("baseCents", base).set("rateBasisPoints", rate)
                        .set("amountCents", Math.round(base * rate / 10000f))
                        .set("status", "CONFIRMED").set("confirmedAt", now), "commission");
            });
        }
    }
}
