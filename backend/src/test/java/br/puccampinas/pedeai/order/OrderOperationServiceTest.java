package br.puccampinas.pedeai.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.tab.TabTotals;

class OrderOperationServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-06T23:30:00Z");

    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final TabTotals tabTotals = mock(TabTotals.class);
    private final OrderOperationService service = new OrderOperationService(mongo, tabTotals,
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final ObjectId storeId = new ObjectId();
    private final ObjectId orderId = new ObjectId();
    private final ObjectId tabId = new ObjectId();
    private final AuthenticatedUser kitchen = new AuthenticatedUser(new ObjectId(), storeId, "KITCHEN");
    private final AuthenticatedUser waiter = new AuthenticatedUser(new ObjectId(), storeId, "WAITER");

    @Test
    void cancelsWithReasonAndRecordsTheEvent() {
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(order("PREPARING", "PREPARING"));

        OrderOperationService.Result result = service.cancel(kitchen, orderId.toHexString(), "OUT_OF_STOCK",
                " acabou o pão ");

        assertEquals("CANCELLED", result.status());
        Document event = savedEvents(1).get(0);
        assertEquals("CANCELLED", event.getString("type"));
        assertEquals("PREPARING", event.getString("from"));
        assertEquals("OUT_OF_STOCK", event.getString("reason"));
        assertEquals("acabou o pão", event.getString("note"));
        assertEquals(kitchen.userId(), event.getObjectId("byUserId"));
        verify(tabTotals).recalculate(storeId, tabId);
    }

    @Test
    void readyOrderCannotBeCancelled() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order("READY", "READY"));

        assertThrows(ConflictException.class,
                () -> service.cancel(kitchen, orderId.toHexString(), "GAVE_UP", null));
        verify(mongo, never()).insert(any(Document.class), eq("orderEvent"));
    }

    @Test
    void unknownReasonIsRejected() {
        assertThrows(InvalidRequestException.class,
                () -> service.cancel(kitchen, orderId.toHexString(), "BORED", null));
    }

    @Test
    void waiterCannotCancel() {
        assertThrows(ForbiddenException.class, () -> service.cancel(waiter, orderId.toHexString(), "GAVE_UP", null));
    }

    @Test
    void partialDeliveryKeepsTheOrderReady() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order")))
                .thenReturn(order("READY", "READY", "READY", "CANCELLED"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(new Document());

        OrderOperationService.Result result = service.deliver(waiter, orderId.toHexString(), List.of(0));

        assertEquals("READY", result.status());
        Document event = savedEvents(1).get(0);
        assertEquals("ITEMS_DELIVERED", event.getString("type"));
        assertEquals(List.of(0), event.getList("itemIndexes", Integer.class));
    }

    @Test
    void deliveringTheLastItemsDeliversTheOrder() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order")))
                .thenReturn(order("READY", "DELIVERED", "READY", "CANCELLED"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(new Document());

        OrderOperationService.Result result = service.deliver(waiter, orderId.toHexString(), List.of(1));

        assertEquals("DELIVERED", result.status());
        List<Document> events = savedEvents(2);
        assertEquals("ITEMS_DELIVERED", events.get(0).getString("type"));
        assertEquals("STATUS_CHANGED", events.get(1).getString("type"));
        assertEquals("DELIVERED", events.get(1).getString("to"));
    }

    @Test
    void itemAlreadyDeliveredIsAConflict() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order")))
                .thenReturn(order("READY", "DELIVERED", "READY"));

        assertThrows(ConflictException.class, () -> service.deliver(waiter, orderId.toHexString(), List.of(0)));
    }

    @Test
    void orderNotReadyCannotBeDelivered() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order")))
                .thenReturn(order("PREPARING", "PREPARING"));

        assertThrows(ConflictException.class, () -> service.deliver(waiter, orderId.toHexString(), List.of(0)));
    }

    @Test
    void changedInAnotherScreenIsAConflict() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order("READY", "READY"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(null);

        assertThrows(ConflictException.class, () -> service.deliver(waiter, orderId.toHexString(), List.of(0)));
        verify(mongo, never()).insert(any(Document.class), eq("orderEvent"));
    }

    @Test
    void kitchenCannotDeliver() {
        assertThrows(ForbiddenException.class, () -> service.deliver(kitchen, orderId.toHexString(), List.of(0)));
    }

    // [Mateus · Card 5] Pagamento no caixa do balcão.
    @Test
    void payingACounterOrderSendsItToTheKitchen() {
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(order("AWAITING_PAYMENT", "AWAITING_PAYMENT").append("totalCents", 3800));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(new Document("_id", tabId).append("customerName", "Bia"));

        OrderOperationService.Result result = service.pay(waiter, orderId.toHexString(), "PIX_MANUAL");

        assertEquals("RECEIVED", result.status());
        ArgumentCaptor<Document> payment = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(payment.capture(), eq("payment"));
        assertEquals(3800, payment.getValue().get("amountCents"));
        assertEquals("PIX_MANUAL", payment.getValue().getString("method"));
        assertEquals(true, payment.getValue().getBoolean("isPartial"));
        verify(mongo).updateFirst(any(Query.class), any(Update.class), eq("tab"));
        Document event = savedEvents(1).get(0);
        assertEquals("AWAITING_PAYMENT", event.getString("from"));
        assertEquals("RECEIVED", event.getString("to"));
    }

    @Test
    void orderNotAwaitingPaymentCannotBePaid() {
        when(mongo.exists(any(Query.class), eq("order"))).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.pay(waiter, orderId.toHexString(), "CASH"));
        verify(mongo, never()).insert(any(Document.class), eq("payment"));
    }

    @Test
    void unknownPaymentMethodIsRejected() {
        assertThrows(InvalidRequestException.class, () -> service.pay(waiter, orderId.toHexString(), "BITCOIN"));
    }

    @Test
    void kitchenCannotRegisterPayment() {
        assertThrows(ForbiddenException.class, () -> service.pay(kitchen, orderId.toHexString(), "CASH"));
    }

    @Test
    void lastPickupClosesThePaidCounterTab() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order("READY", "READY"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(new Document());
        when(mongo.exists(any(Query.class), eq("tab"))).thenReturn(true);
        when(mongo.exists(any(Query.class), eq("order"))).thenReturn(false);
        when(tabTotals.recalculate(storeId, tabId)).thenReturn(new TabTotals.Totals(3800, 0, 0, 3800));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(new Document("_id", tabId).append("paidCents", 3800));

        service.deliver(waiter, orderId.toHexString(), List.of(0));

        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(any(Query.class), update.capture(), eq("tab"));
        assertEquals("CLOSED", update.getValue().getUpdateObject().get("$set", Document.class).getString("status"));
    }

    @Test
    void unpaidCounterTabStaysOpen() {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(order("READY", "READY"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("order"))).thenReturn(new Document());
        when(mongo.exists(any(Query.class), eq("tab"))).thenReturn(true);
        when(mongo.exists(any(Query.class), eq("order"))).thenReturn(false);
        when(tabTotals.recalculate(storeId, tabId)).thenReturn(new TabTotals.Totals(3800, 0, 0, 3800));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(new Document("_id", tabId).append("paidCents", 0));

        service.deliver(waiter, orderId.toHexString(), List.of(0));

        verify(mongo, never()).updateFirst(any(Query.class), any(Update.class), eq("tab"));
    }

    private Document order(String status, String... itemStatuses) {
        List<Document> items = java.util.Arrays.stream(itemStatuses)
                .map(itemStatus -> new Document("nameSnapshot", "X-salada").append("quantity", 1).append("status", itemStatus))
                .toList();
        return new Document("_id", orderId).append("storeId", storeId).append("tabId", tabId).append("status", status)
                .append("items", items);
    }

    private List<Document> savedEvents(int count) {
        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(mongo, times(count)).insert(captor.capture(), eq("orderEvent"));
        return captor.getAllValues();
    }
}
