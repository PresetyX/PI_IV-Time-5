package br.puccampinas.pedeai.report;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
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
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;

@Service
public class ReportService {

    private static final Set<String> ROLES = Set.of("OWNER", "MANAGER");
    private static final Set<String> IGNORED_STATUS = Set.of("CANCELLED", "CANCELED", "REMOVED");
    private static final int TOP_PRODUCTS = 5;

    private final MongoTemplate mongo;
    private final Clock clock;

    public ReportService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public Summary summary(AuthenticatedUser user, String period) {
        requireRole(user);
        int days = days(period);
        Instant end = clock.instant();
        Instant start = startOfDay(days);
        Instant previousStart = start.minus(Duration.ofDays(days));
        Instant previousEnd = end.minus(Duration.ofDays(days));

        Totals current = totals(orders(user.storeId(), start, end));
        Totals previous = totals(orders(user.storeId(), previousStart, previousEnd));
        return new Summary(period.toUpperCase(), current.revenueCents, previous.revenueCents, current.tabs,
                previous.tabs, current.averageTicketCents(), previous.averageTicketCents(),
                current.averagePrepMinutes(), previous.averagePrepMinutes(), current.byHour(), current.top());
    }

    public Abc abc(AuthenticatedUser user, int days) {
        requireRole(user);
        if (days < 1 || days > 90) {
            throw new InvalidRequestException("days must be between 1 and 90");
        }
        Instant start = startOfDay(days);
        Map<Object, ProductSales> sales = new LinkedHashMap<>();
        for (Document order : orders(user.storeId(), start, clock.instant())) {
            for (Document item : items(order)) {
                ProductSales row = sales.computeIfAbsent(item.get("productId"),
                        key -> new ProductSales(item.getString("nameSnapshot")));
                row.quantity += quantity(item);
                row.revenueCents += quantity(item) * number(item, "unitPriceCents");
            }
        }

        Map<Object, String> categories = new HashMap<>();
        mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())), Document.class, "category")
                .forEach(category -> categories.put(category.get("_id"), category.getString("name")));
        List<Document> products = mongo.find(Query.query(Criteria.where("storeId").is(user.storeId())),
                Document.class, "product");
        Map<Object, Object> categoryOfProduct = new HashMap<>();
        for (Document product : products) {
            categoryOfProduct.put(product.get("_id"), product.get("categoryId"));
            sales.computeIfAbsent(product.get("_id"), key -> new ProductSales(product.getString("name")));
        }

        long total = sales.values().stream().mapToLong(row -> row.revenueCents).sum();
        List<Map.Entry<Object, ProductSales>> ranked = new ArrayList<>(sales.entrySet());
        ranked.sort(Comparator.comparingLong((Map.Entry<Object, ProductSales> entry) -> entry.getValue().revenueCents)
                .reversed().thenComparing(entry -> entry.getValue().name));

        List<AbcRow> rows = new ArrayList<>();
        long cumulative = 0;
        for (Map.Entry<Object, ProductSales> entry : ranked) {
            ProductSales row = entry.getValue();
            long before = cumulative;
            cumulative += row.revenueCents;
            int percent = total == 0 ? 100 : (int) Math.round(cumulative * 100.0 / total);
            int startPercent = total == 0 ? 100 : (int) Math.round(before * 100.0 / total);
            String klass = row.revenueCents == 0 ? "C" : startPercent < 80 ? "A" : startPercent < 95 ? "B" : "C";
            String id = entry.getKey() instanceof ObjectId objectId ? objectId.toHexString() : String.valueOf(entry.getKey());
            rows.add(new AbcRow(id, row.name, categories.getOrDefault(categoryOfProduct.get(entry.getKey()), ""),
                    klass, row.quantity, row.revenueCents, percent));
        }
        return new Abc(days, products.size(), total, rows);
    }

    public List<TeamMember> team(AuthenticatedUser user) {
        requireRole(user);
        Query query = Query.query(Criteria.where("storeId").is(user.storeId()))
                .with(Sort.by(Sort.Direction.ASC, "name"));
        return mongo.find(query, Document.class, "user").stream()
                .map(doc -> new TeamMember(doc.getObjectId("_id").toHexString(), doc.getString("name"),
                        doc.getString("email"), doc.getString("role"), Boolean.TRUE.equals(doc.getBoolean("active")),
                        doc.getDate("lastLoginAt") == null ? null : doc.getDate("lastLoginAt").toInstant()))
                .toList();
    }

    private List<Document> orders(ObjectId storeId, Instant start, Instant end) {
        Query query = Query.query(Criteria.where("storeId").is(storeId)
                .and("createdAt").gte(Date.from(start)).lt(Date.from(end))
                .and("status").nin(IGNORED_STATUS));
        return mongo.find(query, Document.class, "order");
    }

    private Totals totals(List<Document> orders) {
        Totals totals = new Totals();
        for (Document order : orders) {
            if (order.get("tabId") != null) {
                totals.tabIds.add(order.get("tabId"));
            }
            Date created = order.getDate("createdAt");
            Date ready = order.getDate("readyAt");
            if (created == null) {
                continue;
            }
            if (ready != null) {
                totals.prepMinutes += Duration.between(created.toInstant(), ready.toInstant()).toMinutes();
                totals.prepCount++;
            }
            int hour = ZonedDateTime.ofInstant(created.toInstant(), OpeningStatusCalculator.STORE_ZONE).getHour();
            for (Document item : items(order)) {
                long value = (long) quantity(item) * number(item, "unitPriceCents");
                totals.revenueCents += value;
                totals.hours.merge(hour, value, Long::sum);
                totals.quantities.merge(item.getString("nameSnapshot"), (long) quantity(item), Long::sum);
            }
        }
        totals.tabs = totals.tabIds.size();
        return totals;
    }

    private static List<Document> items(Document order) {
        return order.getList("items", Document.class, List.of()).stream()
                .filter(item -> !IGNORED_STATUS.contains(item.getString("status")))
                .toList();
    }

    private static int quantity(Document item) {
        return number(item, "quantity");
    }

    private static int number(Document doc, String field) {
        Object value = doc.get(field);
        return value instanceof Number number ? number.intValue() : 0;
    }

    private Instant startOfDay(int days) {
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        return today.minusDays(days - 1L).atStartOfDay(OpeningStatusCalculator.STORE_ZONE).toInstant();
    }

    private static int days(String period) {
        return switch (period.toUpperCase()) {
            case "TODAY" -> 1;
            case "WEEK" -> 7;
            case "MONTH" -> 30;
            default -> throw new InvalidRequestException("period must be TODAY, WEEK or MONTH");
        };
    }

    private static void requireRole(AuthenticatedUser user) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    private static final class ProductSales {
        private final String name;
        private long quantity;
        private long revenueCents;

        private ProductSales(String name) {
            this.name = name;
        }
    }

    private static final class Totals {
        private long revenueCents;
        private int tabs;
        private long prepMinutes;
        private int prepCount;
        private final Set<Object> tabIds = new HashSet<>();
        private final Map<Integer, Long> hours = new HashMap<>();
        private final Map<String, Long> quantities = new HashMap<>();

        private long averageTicketCents() {
            return tabs == 0 ? 0 : Math.round((double) revenueCents / tabs);
        }

        private Integer averagePrepMinutes() {
            return prepCount == 0 ? null : (int) Math.round((double) prepMinutes / prepCount);
        }

        private List<HourRevenue> byHour() {
            return hours.entrySet().stream()
                    .sorted(Comparator.comparingInt(entry -> (entry.getKey() + 18) % 24))
                    .map(entry -> new HourRevenue(entry.getKey(), entry.getValue()))
                    .toList();
        }

        private List<TopProduct> top() {
            return quantities.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(TOP_PRODUCTS)
                    .map(entry -> new TopProduct(entry.getKey(), entry.getValue()))
                    .toList();
        }
    }

    public record Summary(String period, long revenueCents, long previousRevenueCents, int tabs, int previousTabs,
            long averageTicketCents, long previousAverageTicketCents, Integer averagePrepMinutes,
            Integer previousAveragePrepMinutes, List<HourRevenue> byHour, List<TopProduct> topProducts) {
    }

    public record HourRevenue(int hour, long revenueCents) {
    }

    public record TopProduct(String name, long quantity) {
    }

    public record Abc(int days, int productsInMenu, long totalRevenueCents, List<AbcRow> rows) {
    }

    public record AbcRow(String productId, String name, String category, String abcClass, long quantity,
            long revenueCents, int cumulativePercent) {
    }

    public record TeamMember(String id, String name, String email, String role, boolean active,
            Instant lastLoginAt) {
    }
}
