package br.puccampinas.pedeai.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.tab.Tab;
import br.puccampinas.pedeai.tab.TabService;
import br.puccampinas.pedeai.tab.TabTotals;

class PixServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-06T23:00:00Z");

    private final TabService tabService = mock(TabService.class);
    private final TabTotals tabTotals = mock(TabTotals.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final PixService service = new PixService(tabService, tabTotals, mongo);
    private final ObjectId storeId = new ObjectId();
    private final AuthenticatedUser guest = new AuthenticatedUser(new ObjectId(), storeId, "GUEST");

    @Test
    void ownerGetsTheCodeWithTheSameTotalTheCashierCloses() {
        Tab tab = givenTab(guest.userId());
        givenStore("contato@triunfolanches.com");
        when(tabTotals.recalculate(storeId, tab.id())).thenReturn(new TabTotals.Totals(10400, 1040, 0, 11440));

        PixResponse pix = service.pixOfMyTab(guest);

        assertEquals(11440, pix.amountCents());
        assertEquals("Triunfo Lanches", pix.storeName());
        assertTrue(pix.payload().contains("5406114.40"));
    }

    @Test
    void participantCannotPay() {
        givenTab(new ObjectId());
        givenStore("contato@triunfolanches.com");

        assertThrows(ForbiddenException.class, () -> service.pixOfMyTab(guest));
    }

    @Test
    void storeWithoutPixKeyIsAConflict() {
        givenTab(guest.userId());
        givenStore(null);

        assertThrows(ConflictException.class, () -> service.pixOfMyTab(guest));
    }

    @Test
    void emptyTabHasNothingToPay() {
        Tab tab = givenTab(guest.userId());
        givenStore("contato@triunfolanches.com");
        when(tabTotals.recalculate(storeId, tab.id())).thenReturn(new TabTotals.Totals(0, 0, 0, 0));

        PixResponse pix = service.pixOfMyTab(guest);

        assertEquals(0, pix.amountCents());
        assertNull(pix.payload());
    }

    private Tab givenTab(ObjectId ownerSessionId) {
        Tab tab = new Tab(new ObjectId(), storeId, new ObjectId(), "TABLE", "Ana", ownerSessionId, "CUSTOMER", null,
                null, List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
        when(tabService.requireMyTab(guest)).thenReturn(tab);
        return tab;
    }

    private void givenStore(String pixKey) {
        Document store = new Document("_id", storeId).append("name", "Triunfo Lanches")
                .append("address", new Document("city", "Campinas"));
        if (pixKey != null) {
            store.append("pixKey", pixKey);
        }
        when(mongo.findById(storeId, Document.class, "store")).thenReturn(store);
    }
}
