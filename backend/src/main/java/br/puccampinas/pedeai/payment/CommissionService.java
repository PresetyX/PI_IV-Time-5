package br.puccampinas.pedeai.payment;

import java.time.Clock;
import java.time.LocalDate;
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
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;

@Service
public class CommissionService {

    private static final Set<String> ROLES = Set.of("OWNER", "MANAGER");
    private static final int PERIOD_DAYS = 7;

    private final MongoTemplate mongo;
    private final Clock clock;

    public CommissionService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public Report report(AuthenticatedUser user) {
        requireRole(user);
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        LocalDate from = today.minusDays(PERIOD_DAYS - 1L);
        Date start = Date.from(from.atStartOfDay(OpeningStatusCalculator.STORE_ZONE).toInstant());

        Document store = mongo.findById(user.storeId(), Document.class, "store");
        int rate = store == null ? 0 : (int) number(store.get("commissionBasisPoints"));

        Map<Object, Row> rows = new LinkedHashMap<>();
        Query staff = Query.query(Criteria.where("storeId").is(user.storeId()).and("role").in("OWNER", "MANAGER", "WAITER", "KITCHEN"))
                .with(Sort.by(Sort.Direction.ASC, "name"));
        for (Document person : mongo.find(staff, Document.class, "user")) {
            rows.put(person.get("_id"), new Row(person.getObjectId("_id").toHexString(), person.getString("name")));
        }

        Query launched = Query.query(Criteria.where("storeId").is(user.storeId()).and("createdAt").gte(start)
                .and("status").nin("CANCELLED", "CANCELED"));
        for (Document order : mongo.find(launched, Document.class, "order")) {
            for (Document item : order.getList("items", Document.class, List.of())) {
                if (!"STAFF".equals(item.getString("placedByType")) || !(item.get("placedByUserId") instanceof ObjectId userId)
                        || !rows.containsKey(userId)) {
                    continue;
                }
                Row row = rows.get(userId);
                long value = number(item.get("quantity")) * number(item.get("unitPriceCents"));
                row.items += number(item.get("quantity"));
                if (Set.of("CANCELLED", "CANCELED", "REMOVED").contains(item.getString("status"))) {
                    row.reversedCents += Math.round(value * rate / 10000.0);
                } else {
                    row.launchedCents += value;
                    row.pendingCents += Math.round(value * rate / 10000.0);
                }
            }
        }
        Query commissions = Query.query(Criteria.where("storeId").is(user.storeId()).and("createdAt").gte(start));
        for (Document commission : mongo.find(commissions, Document.class, "commission")) {
            Row row = rows.get(commission.get("userId"));
            if (row == null) {
                continue;
            }
            long amount = number(commission.get("amountCents"));
            switch (commission.getString("status")) {
                case "CONFIRMED" -> {
                    row.confirmedCents += amount;
                    row.pendingCents -= amount;
                }
                case "PAID" -> {
                    row.paidCents += amount;
                    row.pendingCents -= amount;
                }
                case "REVERSED" -> row.reversedCents += amount;
                default -> {
                }
            }
        }

        List<Row> list = new ArrayList<>(rows.values());
        list.forEach(row -> row.pendingCents = Math.max(0, row.pendingCents));
        long toPay = list.stream().mapToLong(row -> row.confirmedCents).sum();
        long pending = list.stream().mapToLong(row -> row.pendingCents).sum();
        long reversed = list.stream().mapToLong(row -> row.reversedCents).sum();
        return new Report(from, today, rate, toPay, pending, reversed,
                list.stream().map(Row::view).toList());
    }

    public Report markPaid(AuthenticatedUser user) {
        requireRole(user);
        mongo.updateMulti(Query.query(Criteria.where("storeId").is(user.storeId()).and("status").is("CONFIRMED")),
                new Update().set("status", "PAID").set("paidAt", Date.from(clock.instant())), "commission");
        return report(user);
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0;
    }

    private static void requireRole(AuthenticatedUser user) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    private static final class Row {
        private final String userId;
        private final String name;
        private long items;
        private long launchedCents;
        private long confirmedCents;
        private long pendingCents;
        private long reversedCents;
        private long paidCents;

        private Row(String userId, String name) {
            this.userId = userId;
            this.name = name;
        }

        private WaiterCommission view() {
            return new WaiterCommission(userId, name, items, launchedCents, confirmedCents, pendingCents, reversedCents,
                    paidCents, confirmedCents);
        }
    }

    public record Report(LocalDate from, LocalDate to, int rateBasisPoints, long toPayCents, long pendingCents,
            long reversedCents, List<WaiterCommission> waiters) {
    }

    public record WaiterCommission(String userId, String name, long items, long launchedCents, long confirmedCents,
            long pendingCents, long reversedCents, long paidCents, long toPayCents) {
    }
}
