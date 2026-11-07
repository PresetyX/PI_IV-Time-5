package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

class OrderTrackingServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final TabService tabService = mock(TabService.class);
    private final TableRepository tableRepository = mock(TableRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final OrderTrackingService service = new OrderTrackingService(tabService, tableRepository, mongo);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(new ObjectId(), storeId, "GUEST");

    @BeforeEach
    void givenTab() {
        Tab tab = new Tab(new ObjectId(), storeId, tableId, "TABLE", "Ana", guest.userId(), "CUSTOMER", null, null,
                List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(tab);
        when(tableRepository.findById(tableId))
                .thenReturn(Optional.of(new Table(tableId, storeId, 5, null, 4, "t05", true, NOW)));
    }

    @Test
    void buildsTheTimelineFromTheStatusHistory() {
        Document order = order("READY", item("Porção de fritas", 3200, 1, "READY"),
                item("Chopp 500 ml", 1400, 2, "READY"))
                .append("statusHistory", List.of(step("RECEIVED", "PREPARING", 120), step("PREPARING", "READY", 1200)));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order);

        OrderTrackingResponse tracking = service.track(guest, order.getObjectId("_id").toHexString());

        assertEquals("READY", tracking.status());
        assertEquals(5, tracking.tableNumber());
        assertEquals(6000, tracking.totalCents());
        assertEquals(List.of("RECEIVED", "PREPARING", "READY"),
                tracking.timeline().stream().map(OrderTrackingResponse.Step::status).toList());
        assertEquals(NOW.plusSeconds(1200), tracking.timeline().get(2).at());
    }

    @Test
    void canceledItemStaysListedButOutOfTheTotal() {
        Document order = order("PREPARING", item("Batata", 3200, 1, "PREPARING"), item("Pudim", 1300, 1, "CANCELLED"));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order);

        OrderTrackingResponse tracking = service.track(guest, order.getObjectId("_id").toHexString());

        assertTrue(tracking.items().get(1).canceled());
        assertEquals(3200, tracking.totalCents());
        assertEquals(1, tracking.timeline().size());
    }

    @Test
    void partialDeliveryShowsEachItemStatusAndDeliveryTime() {
        Document order = order("READY",
                item("Chopp 500 ml", 1400, 2, "DELIVERED").append("deliveredAt", Date.from(NOW.plusSeconds(300))),
                item("Porção de fritas", 3200, 1, "READY"));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order);

        OrderTrackingResponse tracking = service.track(guest, order.getObjectId("_id").toHexString());

        assertEquals("DELIVERED", tracking.items().get(0).status());
        assertEquals(NOW.plusSeconds(300), tracking.items().get(0).deliveredAt());
        assertEquals("READY", tracking.items().get(1).status());
        assertEquals(null, tracking.items().get(1).deliveredAt());
    }

    @Test
    void orderOutsideMyTabIsNotFound() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> service.track(guest, new ObjectId().toHexString()));
        assertThrows(ResourceNotFoundException.class, () -> service.track(guest, "nao-e-id"));
    }

    private static Document order(String status, Document... items) {
        return new Document("_id", new ObjectId()).append("number", 42).append("status", status)
                .append("createdAt", Date.from(NOW)).append("items", List.of(items));
    }

    private static Document item(String name, int unitPriceCents, int quantity, String status) {
        return new Document("nameSnapshot", name).append("unitPriceCents", unitPriceCents)
                .append("quantity", quantity).append("status", status);
    }

    private static Document step(String from, String to, long secondsAfter) {
        return new Document("from", from).append("to", to).append("at", Date.from(NOW.plusSeconds(secondsAfter)));
    }
}
