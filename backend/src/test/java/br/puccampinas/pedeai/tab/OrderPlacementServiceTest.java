package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.OrderRejectedException;
import br.puccampinas.pedeai.menu.Option;
import br.puccampinas.pedeai.menu.OptionGroup;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.socket.OrderValidationClient;
import br.puccampinas.pedeai.store.OpeningStatus;
import br.puccampinas.pedeai.store.StoreService;

class OrderPlacementServiceTest {

    /** 20h30 em São Paulo. */
    private static final Instant NOW = Instant.parse("2026-10-27T23:30:00Z");
    private static final OpeningStatus OPEN = new OpeningStatus(true, true, false, "23:30", "23:00", null, "17:00");
    private static final OpeningStatus NOT_ACCEPTING = new OpeningStatus(true, false, false, "23:30", "23:00", null,
            "17:00");

    private final TabService tabService = mock(TabService.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final StoreService storeService = mock(StoreService.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final TabTotals tabTotals = mock(TabTotals.class);
    private final OrderValidationClient validation = mock(OrderValidationClient.class);
    private final OrderPlacementService service = new OrderPlacementService(tabService, productRepository,
            storeService, mongo, Clock.fixed(NOW, ZoneOffset.UTC), tabTotals, validation);

    private final ObjectId storeId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(new ObjectId(), storeId, "GUEST");
    private final Product fries = product("Porção de fritas", 3200, true);
    private final Product beer = product("Chopp 500 ml", 1400, true);
    private Tab tab;

    @BeforeEach
    void givenOpenTab() {
        tab = new Tab(new ObjectId(), storeId, new ObjectId(), "TABLE", "Ana", guest.userId(), "CUSTOMER", null, null,
                List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(tab);
        when(storeService.statusOf(storeId)).thenReturn(Optional.of(OPEN));
        when(productRepository.findAllById(any())).thenReturn(List.of(fries, beer));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("sequence"))).thenReturn(new Document("seq", 7));
    }

    @Test
    void validatesOnTheSocketThenSavesTheOrder() {
        OrderPlacementService.PlacedOrder placed = service.place(guest, request(6000, item(fries, 1, " sem sal "),
                item(beer, 2, null)));

        ArgumentCaptor<OrderValidationClient.OrderValidation> sent =
                ArgumentCaptor.forClass(OrderValidationClient.OrderValidation.class);
        verify(validation).validate(sent.capture());
        OrderValidationClient.OrderValidation order = sent.getValue();
        assertEquals(6000, order.totalCents());
        assertEquals(6000, order.computedCents());
        assertEquals("17:00", order.openAt());
        assertEquals("23:00", order.closeAt());
        assertEquals(LocalTime.of(20, 30), order.now());
        assertEquals(List.of(new OrderValidationClient.Item(3200, 1, "sem sal", List.of()),
                new OrderValidationClient.Item(1400, 2, "", List.of())), order.items());

        ArgumentCaptor<Document> saved = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(saved.capture(), eq("order"));
        Document doc = saved.getValue();
        assertEquals(7, doc.get("number"));
        assertEquals(6000, doc.get("totalCents"));
        Document first = doc.getList("items", Document.class).get(0);
        assertEquals("Porção de fritas", first.getString("nameSnapshot"));
        assertEquals(3200, first.get("unitPriceCents"));
        verify(mongo).insert(any(Document.class), eq("orderEvent"));
        verify(tabTotals).recalculate(storeId, tab.id());

        assertEquals(7, placed.number());
        assertEquals(6000, placed.totalCents());
        assertEquals("RECEIVED", placed.status());
    }

    @Test
    void rejectedBySocketSavesNothingAndKeepsTheNumber() {
        doThrow(new OrderRejectedException(HttpStatus.CONFLICT, OrderRejectedException.PRICE_CHANGED, "mudou"))
                .when(validation).validate(any());

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(5000, item(fries, 1, null), item(beer, 2, null))));

        assertEquals(OrderRejectedException.PRICE_CHANGED, e.getCode());
        assertNothingSaved();
    }

    @Test
    void socketTimeoutSavesNothing() {
        doThrow(new OrderRejectedException(HttpStatus.SERVICE_UNAVAILABLE,
                OrderRejectedException.VALIDATION_UNAVAILABLE, "sem resposta"))
                .when(validation).validate(any());

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(3200, item(fries, 1, null))));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatus());
        assertNothingSaved();
    }

    @Test
    void storeNotAcceptingOrdersIsRejectedBeforeTheSocket() {
        when(storeService.statusOf(storeId)).thenReturn(Optional.of(NOT_ACCEPTING));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(3200, item(fries, 1, null))));

        assertEquals(OrderRejectedException.STORE_CLOSED, e.getCode());
        verifyNoInteractions(validation);
        assertNothingSaved();
    }

    @Test
    void unavailableProductIsRejectedBeforeTheSocket() {
        Product soldOut = product("Pudim", 1300, false);
        when(productRepository.findAllById(any())).thenReturn(List.of(soldOut));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(1300, item(soldOut, 1, null))));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        assertEquals(OrderRejectedException.ITEM_UNAVAILABLE, e.getCode());
        verifyNoInteractions(validation);
        assertNothingSaved();
    }

    @Test
    void productThatLeftTheMenuIsUnavailable() {
        Product gone = product("Pudim", 1300, true);
        when(productRepository.findAllById(any())).thenReturn(List.of());

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(1300, item(gone, 1, null))));

        assertEquals(OrderRejectedException.ITEM_UNAVAILABLE, e.getCode());
        assertNothingSaved();
    }

    @Test
    void optionsComeFromTheCatalogAndAreSavedInTheUnitPrice() {
        Product burger = burger();
        when(productRepository.findAllById(any())).thenReturn(List.of(burger));
        PlaceOrderRequest.Item ordered = new PlaceOrderRequest.Item(burger.id().toHexString(), 2, null,
                List.of(option("Ponto da carne", "Ao ponto"), option("Adicionais", "Bacon extra")));

        service.place(guest, new PlaceOrderRequest(List.of(ordered), 7600));

        ArgumentCaptor<OrderValidationClient.OrderValidation> sent =
                ArgumentCaptor.forClass(OrderValidationClient.OrderValidation.class);
        verify(validation).validate(sent.capture());
        assertEquals(List.of(new OrderValidationClient.Item(3200, 2, "", List.of(0, 600))), sent.getValue().items());
        assertEquals(7600, sent.getValue().computedCents());

        ArgumentCaptor<Document> saved = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(saved.capture(), eq("order"));
        Document line = saved.getValue().getList("items", Document.class).get(0);
        assertEquals(3800, line.get("unitPriceCents"));
        assertEquals(3200, line.get("basePriceCents"));
        assertEquals(List.of("Ao ponto", "Bacon extra"),
                line.getList("options", Document.class).stream().map(o -> o.getString("label")).toList());
        assertEquals(7600, saved.getValue().get("totalCents"));
    }

    @Test
    void missingRequiredOptionIsRejectedBeforeTheSocket() {
        Product burger = burger();
        when(productRepository.findAllById(any())).thenReturn(List.of(burger));
        PlaceOrderRequest.Item ordered = new PlaceOrderRequest.Item(burger.id().toHexString(), 1, null,
                List.of(option("Adicionais", "Bacon extra")));

        assertThrows(InvalidRequestException.class,
                () -> service.place(guest, new PlaceOrderRequest(List.of(ordered), 3800)));

        verifyNoInteractions(validation);
        assertNothingSaved();
    }

    private Product burger() {
        return new Product(new ObjectId(), storeId, new ObjectId(), "Triunfo duplo", null, 3200, null, null, true,
                null, false, 0, List.of(
                        new OptionGroup("Ponto da carne", true, 1, 1,
                                List.of(new Option("Ao ponto", 0), new Option("Bem passado", 0))),
                        new OptionGroup("Adicionais", false, 0, 3,
                                List.of(new Option("Bacon extra", 600), new Option("Ovo", 300)))));
    }

    private static PlaceOrderRequest.SelectedOption option(String group, String label) {
        return new PlaceOrderRequest.SelectedOption(group, label);
    }

    @Test
    void alcoholWithoutAgeConfirmationIsRejectedBeforeTheSocket() {
        Product chopp = product("Chopp 500 ml", 1400, true, true);
        when(productRepository.findAllById(any())).thenReturn(List.of(fries, chopp));

        OrderRejectedException e = assertThrows(OrderRejectedException.class,
                () -> service.place(guest, request(4600, item(fries, 1, null), item(chopp, 1, null))));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, e.getStatus());
        assertEquals(OrderRejectedException.AGE_CONFIRMATION_REQUIRED, e.getCode());
        verifyNoInteractions(validation);
        assertNothingSaved();
    }

    @Test
    void alcoholWithAgeConfirmationIsSavedAsConfirmed() {
        Product chopp = product("Chopp 500 ml", 1400, true, true);
        when(productRepository.findAllById(any())).thenReturn(List.of(chopp));

        service.place(guest, new PlaceOrderRequest(List.of(item(chopp, 2, null)), 2800, true));

        verify(validation).validate(any());
        ArgumentCaptor<Document> saved = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(saved.capture(), eq("order"));
        assertEquals(true, saved.getValue().getBoolean("ageConfirmed"));
    }

    @Test
    void orderWithoutAlcoholIsNotMarkedAsAgeConfirmed() {
        service.place(guest, new PlaceOrderRequest(List.of(item(fries, 1, null)), 3200, true));

        ArgumentCaptor<Document> saved = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(saved.capture(), eq("order"));
        assertEquals(false, saved.getValue().getBoolean("ageConfirmed"));
    }

    // [Mateus · Card 5] Balcão: pedido espera o pagamento e o primeiro pedido ganha a senha do dia.
    @Test
    void counterOrderAwaitsPaymentAndGetsThePickupTicket() {
        Tab counterTab = new Tab(new ObjectId(), storeId, null, "COUNTER", "Bia", guest.userId(), "CUSTOMER", null,
                null, List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(counterTab);
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab"))).thenReturn(new Document("_id", counterTab.id()));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("tab"))).thenReturn(new Document("pickupTicket", 7));

        OrderPlacementService.PlacedOrder placed = service.place(guest, request(3200, item(fries, 1, null)));

        assertEquals("AWAITING_PAYMENT", placed.status());
        assertEquals(7, placed.pickupTicket());
        ArgumentCaptor<Document> saved = ArgumentCaptor.forClass(Document.class);
        verify(mongo).insert(saved.capture(), eq("order"));
        assertEquals("AWAITING_PAYMENT", saved.getValue().getString("status"));
        assertEquals(7, saved.getValue().get("pickupTicket"));
        // O validador do banco recusa tableId null; sem mesa o campo nem vai.
        assertEquals(false, saved.getValue().containsKey("tableId"));
        assertEquals("AWAITING_PAYMENT", saved.getValue().getList("items", Document.class).get(0).getString("status"));
    }

    @Test
    void secondCounterOrderKeepsTheSameTicket() {
        Tab counterTab = new Tab(new ObjectId(), storeId, null, "COUNTER", "Bia", guest.userId(), "CUSTOMER", null,
                null, List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(counterTab);
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(new Document("_id", counterTab.id()).append("pickupTicket", 3));

        OrderPlacementService.PlacedOrder placed = service.place(guest, request(3200, item(fries, 1, null)));

        assertEquals(3, placed.pickupTicket());
        verify(mongo, never()).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("tab"));
    }

    @Test
    void tableOrderHasNoTicket() {
        OrderPlacementService.PlacedOrder placed = service.place(guest, request(3200, item(fries, 1, null)));

        assertEquals("RECEIVED", placed.status());
        assertEquals(null, placed.pickupTicket());
    }

    private void assertNothingSaved() {
        verify(mongo, never()).insert(any(Document.class), anyString());
        verify(mongo, never()).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Document.class), eq("sequence"));
    }

    private Product product(String name, int priceCents, boolean available) {
        return product(name, priceCents, available, false);
    }

    private Product product(String name, int priceCents, boolean available, boolean alcoholic) {
        return new Product(new ObjectId(), storeId, new ObjectId(), name, null, priceCents, null, null, available, null,
                alcoholic, 0, List.of());
    }

    private static PlaceOrderRequest.Item item(Product product, int quantity, String note) {
        return new PlaceOrderRequest.Item(product.id().toHexString(), quantity, note);
    }

    private static PlaceOrderRequest request(int expectedTotalCents, PlaceOrderRequest.Item... items) {
        return new PlaceOrderRequest(List.of(items), expectedTotalCents);
    }
}
