package br.puccampinas.pedeai.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.auth.JwtService;
import br.puccampinas.pedeai.common.ServerUnavailableException;
import br.puccampinas.pedeai.menu.Option;
import br.puccampinas.pedeai.menu.OptionGroup;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.socket.SocketClient;
import br.puccampinas.pedeai.socket.SocketResponse;
import br.puccampinas.pedeai.store.OpeningStatus;
import br.puccampinas.pedeai.store.OpeningStatusCalculator;
import br.puccampinas.pedeai.store.OpeningStatusCalculator.OrderingWindow;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;

class OrderServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");
    private static final OpeningStatus OPEN = new OpeningStatus(true, true, false, "23:30", "23:00", null);
    private static final OpeningStatus CLOSED = new OpeningStatus(false, false, false, null, null, null);
    private static final OpeningStatus PAUSED = new OpeningStatus(true, false, true, "23:30", "23:00", null);
    private static final OrderingWindow WINDOW = new OrderingWindow("17:00", "23:00", "20:00");

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OrderEventRepository eventRepository = mock(OrderEventRepository.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final OpeningStatusCalculator calculator = mock(OpeningStatusCalculator.class);
    private final SocketClient socketClient = mock(SocketClient.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);

    private final ObjectId storeId = new ObjectId();
    private final ObjectId tabId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private final ObjectId sessionId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(sessionId, storeId, JwtService.ROLE_GUEST);

    private final Map<String, String> sentToServer = new HashMap<>();
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, eventRepository, productRepository, storeRepository,
                calculator, socketClient, mongo, new ObjectMapper(), Clock.fixed(NOW, ZoneOffset.UTC));

        Store store = new Store(storeId, "demo", "Demo", null, null, null, null, null, "#D62F1F", null, List.of(),
                List.of("TABLE"), 1000, 500, false, null, null, false, true, null, null);
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        givenStoreStatus(OPEN);
        givenTab("OPEN", sessionId);
        when(mongo.findAndModify(any(), any(), any(), eq(Document.class), eq("sequence")))
                .thenReturn(new Document("seq", 7));
        when(orderRepository.save(any())).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            return new Order(new ObjectId(), order.storeId(), order.tabId(), order.tableId(), order.number(),
                    order.status(), order.ageConfirmed(), order.items(), order.totalCents(), order.createdAt());
        });
        when(socketClient.send(eq("VALIDATE_ORDER"), any())).thenAnswer(invocation -> {
            Map<String, String> params = invocation.getArgument(1);
            sentToServer.putAll(params);
            return new SocketResponse(true, "{\"valid\":true,\"totalCents\":" + params.get("computedCents") + "}",
                    null, null);
        });
    }

    // ------------------------------------------------------------------ gravação

    @Test
    void savesOrderCopyingNameAndPriceAndRecalculatingTotalFromTheDatabase() {
        Product product = product("Triunfo duplo", 3900, true, false, List.of(
                new OptionGroup("Adicionais", false, 0, 3,
                        List.of(new Option("Bacon extra", 600), new Option("Ovo", 300)))));
        givenProducts(product);

        Order order = orderService.create(guest, request(9000, null,
                new CreateOrderRequest.Item(product.id().toHexString(), 2, "  sem cebola ",
                        List.of(new CreateOrderRequest.Choice("Adicionais", "Bacon extra")))));

        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(saved.capture());
        Order value = saved.getValue();
        assertEquals(storeId, value.storeId());
        assertEquals(tabId, value.tabId());
        assertEquals(tableId, value.tableId());
        assertEquals(7, value.number());
        assertEquals("RECEIVED", value.status());
        assertEquals(9000, value.totalCents());
        assertFalse(value.ageConfirmed());
        assertEquals(NOW, value.createdAt());

        Order.OrderItem item = value.items().get(0);
        assertEquals(product.id(), item.productId());
        assertEquals("Triunfo duplo", item.nameSnapshot());
        assertEquals(3900, item.unitPriceCents());
        assertEquals(2, item.quantity());
        assertEquals("sem cebola", item.note());
        assertEquals(List.of(new Order.OrderOption("Adicionais", "Bacon extra", 600)), item.options());
        assertEquals("RECEIVED", item.status());
        assertEquals("CUSTOMER", item.placedByType());
        assertEquals(sessionId, item.placedBySessionId());
        assertNull(item.placedByUserId());
        assertEquals(value.totalCents(), order.totalCents());
    }

    @Test
    void recordsCreatedEvent() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);

        Order order = orderService.create(guest, request(1300, null, item(product, 1)));

        ArgumentCaptor<OrderEvent> event = ArgumentCaptor.forClass(OrderEvent.class);
        verify(eventRepository).save(event.capture());
        assertEquals(order.id(), event.getValue().orderId());
        assertEquals(storeId, event.getValue().storeId());
        assertEquals("CREATED", event.getValue().type());
        assertEquals("RECEIVED", event.getValue().to());
        assertNull(event.getValue().byUserId());
    }

    @Test
    void failureWritingTheEventDoesNotFailAnOrderAlreadySaved() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        when(eventRepository.save(any())).thenThrow(new DataAccessResourceFailureException("down"));

        Order order = orderService.create(guest, request(1300, null, item(product, 1)));

        assertEquals(7, order.number());
    }

    @Test
    void sendsServerTheRecomputedItemsTotalAndOpeningWindow() {
        Product product = product("Batata frita", 3200, true, false, null);
        givenProducts(product);

        orderService.create(guest, request(6400, null, item(product, 2)));

        assertEquals("6400", sentToServer.get("totalCents"));
        assertEquals("6400", sentToServer.get("computedCents"));
        assertEquals("17:00", sentToServer.get("openAt"));
        assertEquals("23:00", sentToServer.get("closeAt"));
        assertEquals("20:00", sentToServer.get("now"));
        assertEquals("[{\"unitPriceCents\":3200,\"quantity\":2}]", sentToServer.get("items"));
    }

    @Test
    void orderNumberKeyFollowsTheStoreDayNotTheUtcDay() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        // 01:30 UTC de 28/10 ainda é 22:30 de 27/10 em São Paulo
        OrderService lateService = new OrderService(orderRepository, eventRepository, productRepository,
                storeRepository, calculator, socketClient, mongo, new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-10-28T01:30:00Z"), ZoneOffset.UTC));

        lateService.create(guest, request(1300, null, item(product, 1)));

        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongo).findAndModify(query.capture(), any(), any(), eq(Document.class), eq("sequence"));
        assertEquals(storeId.toHexString() + ":2026-10-27:order", query.getValue().getQueryObject().get("_id"));
    }

    @Test
    void staffOrderIsMarkedAsPlacedByStaff() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        ObjectId waiterId = new ObjectId();

        orderService.create(new AuthenticatedUser(waiterId, storeId, "WAITER"),
                request(1300, null, item(product, 1)));

        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(saved.capture());
        Order.OrderItem item = saved.getValue().items().get(0);
        assertEquals("STAFF", item.placedByType());
        assertEquals(waiterId, item.placedByUserId());
        assertNull(item.placedBySessionId());
    }

    // ------------------------------------------------------------------ disponibilidade

    @Test
    void unavailableItemIsRejectedBeforeTheServerIsAskedAndNothingIsSaved() {
        Product soldOut = product("Pudim", 1300, false, false, null);
        givenProducts(soldOut);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(soldOut, 1))));

        assertEquals("item_unavailable", e.code());
        assertEquals(HttpStatus.CONFLICT, e.status());
        assertTrue(e.getMessage().contains("Pudim"));
        verifyNoInteractions(socketClient);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void productFromAnotherStoreIsTreatedAsUnavailable() {
        Product elsewhere = product("Outro", 1000, true, false, null);
        givenProducts(); // o repositório filtra por loja e não devolve nada

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1000, null, item(elsewhere, 1))));

        assertEquals("item_unavailable", e.code());
        verify(orderRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ idade

    @Test
    void alcoholicOrderNeedsAgeConfirmation() {
        Product beer = product("Cerveja long neck", 1200, true, true, null);
        givenProducts(beer);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1200, false, item(beer, 1))));

        assertEquals("age_confirmation_required", e.code());
        assertEquals(HttpStatus.BAD_REQUEST, e.status());
        verifyNoInteractions(socketClient);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void alcoholicOrderWithConfirmationIsSavedWithTheFlag() {
        Product beer = product("Cerveja long neck", 1200, true, true, null);
        givenProducts(beer);

        Order order = orderService.create(guest, request(1200, true, item(beer, 1)));

        assertTrue(order.ageConfirmed());
    }

    @Test
    void ageConfirmationIsNotRecordedWhenNothingAlcoholicWasOrdered() {
        Product juice = product("Suco de laranja", 1200, true, false, null);
        givenProducts(juice);

        Order order = orderService.create(guest, request(1200, true, item(juice, 1)));

        assertFalse(order.ageConfirmed());
    }

    // ------------------------------------------------------------------ server de validação

    @Test
    void serverSilenceRefusesTheOrderAndNothingIsSaved() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        doThrow(new ServerUnavailableException("timeout")).when(socketClient).send(eq("VALIDATE_ORDER"), any());

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("server_unavailable", e.code());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.status());
        verify(orderRepository, never()).save(any());
        verify(mongo, never()).findAndModify(any(), any(), any(), eq(Document.class), eq("sequence"));
    }

    @Test
    void totalMismatchFromTheServerRefusesTheOrder() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenServerAnswers(new SocketResponse(false, null, "TOTAL_MISMATCH", "Total 1000 does not match"));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1000, null, item(product, 1))));

        assertEquals("total_mismatch", e.code());
        assertEquals(HttpStatus.CONFLICT, e.status());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void closedHoursFromTheServerRefusesTheOrder() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenServerAnswers(new SocketResponse(false, null, "CLOSED_HOURS", "Store is closed"));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("store_closed", e.code());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void unknownServerErrorRefusesTheOrder() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenServerAnswers(new SocketResponse(false, null, "INTERNAL", "boom"));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("upstream_error", e.code());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void okAnswerThatDoesNotConfirmTheTotalIsNotAccepted() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenServerAnswers(new SocketResponse(true, "{\"valid\":true,\"totalCents\":999}", null, null));

        assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        verify(orderRepository, never()).save(any());
    }

    @Test
    void garbledOkAnswerIsNotAccepted() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenServerAnswers(new SocketResponse(true, "not json", null, null));

        assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        verify(orderRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ casa

    @Test
    void closedStoreRejectsTheOrderWithoutAskingTheServer() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenStoreStatus(CLOSED);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("store_closed", e.code());
        verifyNoInteractions(socketClient);
    }

    @Test
    void pausedStoreRejectsTheOrderWithoutAskingTheServer() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenStoreStatus(PAUSED);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("store_paused", e.code());
        verifyNoInteractions(socketClient);
    }

    // ------------------------------------------------------------------ comanda

    @Test
    void unknownTabIsNotFound() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab"))).thenReturn(null);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("not_found", e.code());
    }

    @Test
    void guestCannotOrderOnSomeoneElsesTab() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenTab("OPEN", new ObjectId());

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("forbidden", e.code());
        assertEquals(HttpStatus.FORBIDDEN, e.status());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void participantOfTheTabCanOrder() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        ObjectId participantId = new ObjectId();
        Document tab = tab("OPEN", new ObjectId())
                .append("participants", List.of(new Document("sessionId", participantId).append("name", "Bia")));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab"))).thenReturn(tab);

        Order order = orderService.create(new AuthenticatedUser(participantId, storeId, JwtService.ROLE_GUEST),
                request(1300, null, item(product, 1)));

        assertEquals(7, order.number());
    }

    @Test
    void removedParticipantCannotOrder() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        ObjectId participantId = new ObjectId();
        Document tab = tab("OPEN", new ObjectId()).append("participants", List.of(
                new Document("sessionId", participantId).append("name", "Bia").append("removedAt", NOW)));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab"))).thenReturn(tab);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(new AuthenticatedUser(participantId, storeId, JwtService.ROLE_GUEST),
                        request(1300, null, item(product, 1))));

        assertEquals("forbidden", e.code());
    }

    @Test
    void closedTabDoesNotAcceptOrders() {
        Product product = product("Pudim", 1300, true, false, null);
        givenProducts(product);
        givenTab("CLOSED", sessionId);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(1300, null, item(product, 1))));

        assertEquals("tab_not_open", e.code());
        assertEquals(HttpStatus.CONFLICT, e.status());
    }

    // ------------------------------------------------------------------ opções

    @Test
    void optionThatDoesNotExistInTheMenuIsRejected() {
        Product product = product("Triunfo duplo", 3900, true, false, List.of(
                new OptionGroup("Adicionais", false, 0, 3, List.of(new Option("Ovo", 300)))));
        givenProducts(product);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(3900, null,
                        new CreateOrderRequest.Item(product.id().toHexString(), 1, null,
                                List.of(new CreateOrderRequest.Choice("Adicionais", "Caviar"))))));

        assertEquals("validation", e.code());
        verifyNoInteractions(socketClient);
    }

    @Test
    void missingRequiredGroupIsRejected() {
        Product product = product("Batata frita", 3200, true, false, List.of(
                new OptionGroup("Tamanho", true, 1, 1,
                        List.of(new Option("Meia porção", -1200), new Option("Porção inteira", 0)))));
        givenProducts(product);

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> orderService.create(guest, request(3200, null, item(product, 1))));

        assertEquals("validation", e.code());
        verifyNoInteractions(socketClient);
    }

    @Test
    void moreChoicesThanTheGroupAllowsIsRejected() {
        Product product = product("Batata frita", 3200, true, false, List.of(
                new OptionGroup("Tamanho", true, 1, 1,
                        List.of(new Option("Meia porção", -1200), new Option("Porção inteira", 0)))));
        givenProducts(product);

        assertThrows(OrderRejectedException.class, () -> orderService.create(guest, request(3200, null,
                new CreateOrderRequest.Item(product.id().toHexString(), 1, null, List.of(
                        new CreateOrderRequest.Choice("Tamanho", "Meia porção"),
                        new CreateOrderRequest.Choice("Tamanho", "Porção inteira"))))));
    }

    @Test
    void negativeOptionDeltaAdjustsTheTotal() {
        Product product = product("Batata frita", 3200, true, false, List.of(
                new OptionGroup("Tamanho", true, 1, 1,
                        List.of(new Option("Meia porção", -1200), new Option("Porção inteira", 0)))));
        givenProducts(product);

        Order order = orderService.create(guest, request(2000, null,
                new CreateOrderRequest.Item(product.id().toHexString(), 1, null,
                        List.of(new CreateOrderRequest.Choice("Tamanho", "Meia porção")))));

        assertEquals(2000, order.totalCents());
        assertEquals("2000", sentToServer.get("computedCents"));
    }

    @Test
    void invalidIdsAreRejected() {
        assertThrows(OrderRejectedException.class, () -> orderService.create(guest, new CreateOrderRequest(
                "not-an-id", List.of(new CreateOrderRequest.Item(new ObjectId().toHexString(), 1, null, null)),
                100, null)));
        assertThrows(OrderRejectedException.class, () -> orderService.create(guest, new CreateOrderRequest(
                tabId.toHexString(), List.of(new CreateOrderRequest.Item("nope", 1, null, null)), 100, null)));
    }

    // ------------------------------------------------------------------ apoio

    private void givenStoreStatus(OpeningStatus status) {
        Store store = storeRepository.findById(storeId).orElseThrow();
        when(calculator.calculate(store)).thenReturn(status);
        when(calculator.orderingWindow(store)).thenReturn(Optional.of(WINDOW));
    }

    private void givenProducts(Product... products) {
        when(productRepository.findByStoreIdAndIdIn(eq(storeId), any())).thenReturn(List.of(products));
    }

    private void givenTab(String status, ObjectId ownerSessionId) {
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(tab(status, ownerSessionId));
    }

    private Document tab(String status, ObjectId ownerSessionId) {
        return new Document("_id", tabId).append("storeId", storeId).append("tableId", tableId)
                .append("status", status).append("ownerSessionId", ownerSessionId);
    }

    private void givenServerAnswers(SocketResponse response) {
        // doReturn: refazer um stub com when() chamaria o Answer do setUp com argumentos nulos
        doReturn(response).when(socketClient).send(eq("VALIDATE_ORDER"), any());
    }

    private Product product(String name, int priceCents, boolean available, boolean alcoholic,
            List<OptionGroup> groups) {
        return new Product(new ObjectId(), storeId, new ObjectId(), name, "", priceCents, null, 10, available,
                null, alcoholic, 0, groups);
    }

    private CreateOrderRequest.Item item(Product product, int quantity) {
        return new CreateOrderRequest.Item(product.id().toHexString(), quantity, null, null);
    }

    private CreateOrderRequest request(int totalCents, Boolean ageConfirmed, CreateOrderRequest.Item... items) {
        return new CreateOrderRequest(tabId.toHexString(), List.of(items), totalCents, ageConfirmed);
    }
}
