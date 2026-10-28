package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

class BillServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final TabService tabService = mock(TabService.class);
    private final TableRepository tableRepository = mock(TableRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final BillService billService = new BillService(tabService, tableRepository, mongo);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(new ObjectId(), storeId, "GUEST");

    @Test
    void sumsConsumptionAddsTenPercentServiceAndLeavesCanceledOutOfTheTotal() {
        givenTab();
        givenOrders(
                order(42, "READY", item("Porção de fritas", 3200, 1, "DELIVERED"),
                        item("Chopp 500 ml", 1400, 2, "DELIVERED")),
                order(43, "CANCELED", item("Pudim", 1300, 1, "CANCELED")),
                order(44, "PREPARING", item("Caipirinha", 2200, 1, "PREPARING")));

        BillResponse bill = billService.billOfMyTab(guest);

        assertEquals(5, bill.tableNumber());
        assertEquals(3, bill.orders().size());
        assertEquals(3200 + 2800 + 2200, bill.consumptionCents());
        assertEquals(820, bill.serviceFeeCents());
        assertEquals(9020, bill.totalCents());
    }

    @Test
    void keepsCanceledItemsInTheListMarkedAsCanceled() {
        givenTab();
        givenOrders(
                order(42, "PREPARING", item("Batata", 3200, 1, "PREPARING"), item("Pudim", 1300, 1, "CANCELED")),
                order(43, "CANCELED", item("Torresmo", 2600, 1, "PREPARING")));

        BillResponse bill = billService.billOfMyTab(guest);

        assertTrue(bill.orders().get(0).items().get(1).canceled());
        assertTrue(bill.orders().get(1).items().get(0).canceled());
        assertEquals(3200, bill.consumptionCents());
    }

    @Test
    void emptyTabHasZeroTotals() {
        givenTab();
        givenOrders();

        BillResponse bill = billService.billOfMyTab(guest);

        assertTrue(bill.orders().isEmpty());
        assertEquals(0, bill.totalCents());
    }

    private void givenTab() {
        Tab tab = new Tab(new ObjectId(), storeId, tableId, "TABLE", "Ana", new ObjectId(), "CUSTOMER", null, null,
                List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(tab);
        when(tableRepository.findById(tableId))
                .thenReturn(Optional.of(new Table(tableId, storeId, 5, null, 4, "t05", true, NOW)));
    }

    private void givenOrders(Document... orders) {
        when(mongo.find(any(Query.class), eq(Document.class), eq("order"))).thenReturn(List.of(orders));
    }

    private static Document order(int number, String status, Document... items) {
        return new Document("_id", new ObjectId()).append("number", number).append("status", status)
                .append("items", List.of(items));
    }

    private static Document item(String name, int unitPriceCents, int quantity, String status) {
        return new Document("nameSnapshot", name).append("unitPriceCents", unitPriceCents)
                .append("quantity", quantity).append("status", status);
    }
}
