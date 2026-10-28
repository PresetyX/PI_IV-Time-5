package br.puccampinas.pedeai.report;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;

@Service
public class HistoryService {

    private static final Set<String> ROLES = Set.of("OWNER", "MANAGER");
    private static final Set<String> IGNORED_STATUS = Set.of("CANCELLED", "CANCELED", "REMOVED");

    private final MongoTemplate mongo;
    private final Clock clock;

    public HistoryService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public History closedTabs(AuthenticatedUser user, String period, String search) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        LocalDate from;
        LocalDate to;
        switch (period.toUpperCase()) {
            case "TODAY" -> {
                from = today;
                to = today.plusDays(1);
            }
            case "YESTERDAY" -> {
                from = today.minusDays(1);
                to = today;
            }
            case "WEEK" -> {
                from = today.minusDays(6);
                to = today.plusDays(1);
            }
            default -> throw new InvalidRequestException("period must be TODAY, YESTERDAY or WEEK");
        }

        ObjectId storeId = user.storeId();
        Query query = Query.query(Criteria.where("storeId").is(storeId).and("status").is("CLOSED")
                .and("closedAt").gte(start(from)).lt(start(to)))
                .with(Sort.by(Sort.Direction.DESC, "closedAt"));
        List<Document> tabs = mongo.find(query, Document.class, "tab");
        List<ObjectId> tabIds = tabs.stream().map(tab -> tab.getObjectId("_id")).toList();

        Map<Object, Integer> tableNumbers = new HashMap<>();
        mongo.find(Query.query(Criteria.where("storeId").is(storeId)), Document.class, "table")
                .forEach(table -> tableNumbers.put(table.get("_id"), number(table.get("number"))));
        Map<Object, String> userNames = new HashMap<>();
        mongo.find(Query.query(Criteria.where("storeId").is(storeId)), Document.class, "user")
                .forEach(person -> userNames.put(person.get("_id"), person.getString("name")));
        Map<Object, Set<String>> methods = new HashMap<>();
        mongo.find(Query.query(Criteria.where("storeId").is(storeId).and("tabId").in(tabIds)), Document.class, "payment")
                .forEach(payment -> methods.computeIfAbsent(payment.get("tabId"), key -> new LinkedHashSet<>())
                        .add(payment.getString("method")));
        Map<Object, Integer> itemCounts = new HashMap<>();
        mongo.find(Query.query(Criteria.where("storeId").is(storeId).and("tabId").in(tabIds)
                .and("status").nin(IGNORED_STATUS)), Document.class, "order")
                .forEach(order -> order.getList("items", Document.class, List.of()).stream()
                        .filter(item -> !IGNORED_STATUS.contains(item.getString("status")))
                        .forEach(item -> itemCounts.merge(order.get("tabId"), number(item.get("quantity")), Integer::sum)));

        String needle = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<ClosedTab> rows = new ArrayList<>();
        long revenue = 0;
        for (Document tab : tabs) {
            Integer table = tableNumbers.get(tab.get("tableId"));
            String origin = "COUNTER".equals(tab.getString("mode")) ? "Balcão" : table == null ? "Mesa" : String.format("Mesa %02d", table);
            String name = tab.getString("customerName") == null ? "Comanda" : tab.getString("customerName");
            int total = number(tab.get("totalCents"));
            String totalText = String.format(Locale.ROOT, "%d,%02d", total / 100, total % 100);
            if (!needle.isEmpty() && !(name.toLowerCase(Locale.ROOT).contains(needle)
                    || origin.toLowerCase(Locale.ROOT).contains(needle) || totalText.contains(needle))) {
                continue;
            }
            revenue += total;
            rows.add(new ClosedTab(tab.getObjectId("_id").toHexString(), name, origin,
                    List.copyOf(methods.getOrDefault(tab.get("_id"), Set.of())),
                    userNames.getOrDefault(tab.get("closedByUserId"), "automático"), total,
                    itemCounts.getOrDefault(tab.get("_id"), 0), tab.getDate("closedAt").toInstant()));
        }
        long averageTicket = rows.isEmpty() ? 0 : Math.round((double) revenue / rows.size());
        return new History(period.toUpperCase(), rows.size(), revenue, averageTicket, rows);
    }

    private static Date start(LocalDate day) {
        Instant instant = day.atStartOfDay(OpeningStatusCalculator.STORE_ZONE).toInstant();
        return Date.from(instant);
    }

    private static int number(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    public record History(String period, int count, long revenueCents, long averageTicketCents, List<ClosedTab> tabs) {
    }

    public record ClosedTab(String id, String name, String origin, List<String> methods, String closedBy,
            int totalCents, int items, Instant closedAt) {
    }
}
