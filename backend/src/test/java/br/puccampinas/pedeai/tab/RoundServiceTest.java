package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
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
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;
import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.session.GuestSessionRepository;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

class RoundServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final TabService tabService = mock(TabService.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final GuestSessionRepository sessionRepository = mock(GuestSessionRepository.class);
    private final TableRepository tableRepository = mock(TableRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final RoundService roundService = new RoundService(tabService, productRepository, sessionRepository,
            tableRepository, mongo);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private final ObjectId me = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(me, storeId, "GUEST");
    private final GuestSession caio = new GuestSession(new ObjectId(), storeId, tableId, "TABLE", "Caio", null, null,
            NOW, NOW.plusSeconds(3600));
    private final Product fritas = product("Porção de fritas", 3200, true);
    private final Product chopp = product("Chopp 500 ml", 1400, true);
    private final Product pastel = product("Pastel de queijo", 900, false);
    private final Product caipirinha = product("Caipirinha", 2200, true);
    private final Product pudim = product("Pudim", 1300, false);

    @BeforeEach
    void givenTab() {
        Tab tab = new Tab(new ObjectId(), storeId, tableId, "TABLE", "Ana", me, "CUSTOMER", null, null, List.of(),
                "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(tab);
        when(tableRepository.findById(tableId))
                .thenReturn(Optional.of(new Table(tableId, storeId, 5, null, 4, "t05", true, NOW)));
        when(mongo.find(any(Query.class), eq(Document.class), eq("tab")))
                .thenReturn(List.of(new Document("_id", tab.id())));
        when(productRepository.findAllById(anyIterable()))
                .thenReturn(List.of(fritas, chopp, pastel, caipirinha, pudim));
        when(sessionRepository.findAllById(anyIterable())).thenReturn(List.of(caio));
    }

    @Test
    void repeatsTheLastOrderWithTodaysPriceAndAvailability() {
        Document last = order(42, item(fritas, 3000, 1, "sem sal", me), item(chopp, 1400, 2, null, me),
                item(pastel, 900, 1, null, me), canceled(item(pudim, 1300, 1, null, me)));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(last);
        when(mongo.find(any(Query.class), eq(Document.class), eq("order"))).thenReturn(List.of(last));

        RoundResponse round = roundService.roundOfMyTab(guest);

        assertEquals(42, round.lastOrderNumber());
        assertEquals(5, round.tableNumber());
        assertEquals(3, round.items().size());
        assertEquals(3200, round.items().get(0).unitPriceCents());
        assertEquals("sem sal", round.items().get(0).note());
        assertEquals(2, round.items().get(1).quantity());
        assertFalse(round.items().get(2).available());
    }

    @Test
    void suggestsWhatOthersOnTheTableOrderedThatIsAvailableAndNotInTheRound() {
        Document last = order(42, item(fritas, 3200, 1, null, me));
        Document fromCaio = order(43, item(caipirinha, 2200, 1, null, caio.id()), item(fritas, 3200, 1, null,
                caio.id()), item(pudim, 1300, 1, null, caio.id()));
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("order"))).thenReturn(last);
        when(mongo.find(any(Query.class), eq(Document.class), eq("order"))).thenReturn(List.of(fromCaio, last));

        RoundResponse round = roundService.roundOfMyTab(guest);

        assertEquals(1, round.suggestions().size());
        assertEquals("Caipirinha", round.suggestions().get(0).name());
        assertEquals("Caio", round.suggestions().get(0).orderedBy());
    }

    @Test
    void tabWithoutOrdersHasNothingToRepeat() {
        when(mongo.find(any(Query.class), eq(Document.class), eq("order"))).thenReturn(List.of());

        RoundResponse round = roundService.roundOfMyTab(guest);

        assertNull(round.lastOrderNumber());
        assertTrue(round.items().isEmpty());
        assertTrue(round.suggestions().isEmpty());
    }

    private Product product(String name, int priceCents, boolean available) {
        return new Product(new ObjectId(), storeId, new ObjectId(), name, null, priceCents, null, null, available,
                null, false, 0, List.of());
    }

    private static Document order(int number, Document... items) {
        return new Document("_id", new ObjectId()).append("number", number).append("status", "RECEIVED")
                .append("createdAt", Date.from(NOW)).append("items", List.of(items));
    }

    private static Document item(Product product, int unitPriceCents, int quantity, String note, ObjectId by) {
        return new Document("productId", product.id()).append("nameSnapshot", product.name())
                .append("unitPriceCents", unitPriceCents).append("quantity", quantity).append("note", note)
                .append("status", "RECEIVED").append("placedBySessionId", by);
    }

    private static Document canceled(Document item) {
        return item.append("status", "CANCELED");
    }
}
