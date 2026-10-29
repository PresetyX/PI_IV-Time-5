package br.puccampinas.pedeai.payment;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
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

@Service
public class CashService {

    static final int NOTE_REQUIRED_ABOVE_CENTS = 2000;
    private static final Set<String> ROLES = Set.of("OWNER", "MANAGER");
    private static final List<String> METHOD_ORDER = List.of("CASH", "PIX_MANUAL", "CARD_DEBIT", "CARD_CREDIT");

    private final MongoTemplate mongo;
    private final Clock clock;

    public CashService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public CashView current(AuthenticatedUser user) {
        requireRole(user);
        Document day = openDay(user.storeId());
        int openTabs = (int) mongo.count(Query.query(Criteria.where("storeId").is(user.storeId())
                .and("status").in("OPEN", "AWAITING_PAYMENT")), "tab");
        if (day == null) {
            return new CashView(false, null, null, 0, List.of(), 0, List.of(), 0, openTabs);
        }

        Date openedAt = day.getDate("openedAt");
        Map<String, Long> byMethod = new LinkedHashMap<>();
        METHOD_ORDER.forEach(method -> byMethod.put(method, 0L));
        mongo.find(Query.query(Criteria.where("storeId").is(user.storeId()).and("createdAt").gte(openedAt)),
                Document.class, "payment")
                .forEach(payment -> byMethod.merge(payment.getString("method"), number(payment.get("amountCents")), Long::sum));
        long sales = byMethod.values().stream().mapToLong(Long::longValue).sum();

        List<Withdrawal> withdrawals = new ArrayList<>();
        for (Document withdrawal : day.getList("withdrawals", Document.class, List.of())) {
            withdrawals.add(new Withdrawal(withdrawal.getString("reason"), number(withdrawal.get("amountCents")),
                    withdrawal.getDate("at").toInstant()));
        }
        long commissions = mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())
                .and("status").is("CONFIRMED").and("confirmedAt").gte(openedAt)), Document.class, "commission")
                .stream().mapToLong(commission -> number(commission.get("amountCents"))).sum();

        String openedBy = userName(day.get("openedByUserId"));
        List<MethodTotal> methods = byMethod.entrySet().stream()
                .map(entry -> new MethodTotal(entry.getKey(), entry.getValue())).toList();
        return new CashView(true, openedAt.toInstant(), openedBy, number(day.get("openingFloatCents")), methods, sales,
                withdrawals, commissions, openTabs);
    }

    public CashView open(AuthenticatedUser user, int openingFloatCents) {
        requireRole(user);
        if (openingFloatCents < 0) {
            throw new InvalidRequestException("openingFloatCents must not be negative");
        }
        if (openDay(user.storeId()) != null) {
            throw new ConflictException("Cash register is already open");
        }
        mongo.insert(new Document("storeId", user.storeId()).append("openedByUserId", user.userId())
                .append("openingFloatCents", openingFloatCents).append("openedAt", Date.from(clock.instant()))
                .append("withdrawals", List.of()), "cashDay");
        return current(user);
    }

    public CashView withdraw(AuthenticatedUser user, String reason, int amountCents) {
        requireRole(user);
        if (reason == null || reason.isBlank() || amountCents <= 0) {
            throw new InvalidRequestException("reason and a positive amount are required");
        }
        Document day = requireOpenDay(user.storeId());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(day.get("_id"))),
                new Update().push("withdrawals", new Document("reason", reason.trim()).append("amountCents", amountCents)
                        .append("at", Date.from(clock.instant())).append("byUserId", user.userId())),
                "cashDay");
        return current(user);
    }

    public Map<String, Object> close(AuthenticatedUser user, Map<String, Integer> counted, String note) {
        requireRole(user);
        Document day = requireOpenDay(user.storeId());
        CashView view = current(user);
        if (view.openTabs() > 0) {
            throw new ConflictException("Close the open tabs before closing the cash register");
        }
        Document countedDoc = new Document();
        long difference = 0;
        for (MethodTotal method : view.methods()) {
            long system = method.amountCents() + (method.method().equals("CASH")
                    ? view.openingFloatCents() - view.withdrawals().stream().mapToLong(Withdrawal::amountCents).sum()
                    : 0);
            int value = counted == null || counted.get(method.method()) == null ? (int) system : counted.get(method.method());
            countedDoc.append(method.method(), value);
            difference += value - system;
        }
        if (Math.abs(difference) > NOTE_REQUIRED_ABOVE_CENTS && (note == null || note.isBlank())) {
            throw new InvalidRequestException("A difference above R$ 20,00 needs a justification");
        }
        Date now = Date.from(clock.instant());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(day.get("_id"))),
                new Update().set("closedAt", now).set("closedByUserId", user.userId()).set("countedCents", countedDoc)
                        .set("differenceCents", (int) difference).set("differenceNote", note == null ? "" : note.trim()),
                "cashDay");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("closedAt", now.toInstant());
        body.put("differenceCents", difference);
        return body;
    }

    private Document openDay(ObjectId storeId) {
        Query query = Query.query(Criteria.where("storeId").is(storeId).and("closedAt").exists(false))
                .with(Sort.by(Sort.Direction.DESC, "openedAt"));
        return mongo.findOne(query, Document.class, "cashDay");
    }

    private Document requireOpenDay(ObjectId storeId) {
        Document day = openDay(storeId);
        if (day == null) {
            throw new ResourceNotFoundException("No open cash register");
        }
        return day;
    }

    private String userName(Object userId) {
        Document person = userId == null ? null : mongo.findById(userId, Document.class, "user");
        return person == null ? null : person.getString("name");
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0;
    }

    private static void requireRole(AuthenticatedUser user) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    public record CashView(boolean open, Instant openedAt, String openedBy, long openingFloatCents,
            List<MethodTotal> methods, long salesCents, List<Withdrawal> withdrawals, long commissionsCents,
            int openTabs) {
    }

    public record MethodTotal(String method, long amountCents) {
    }

    public record Withdrawal(String reason, long amountCents, Instant at) {
    }
}
