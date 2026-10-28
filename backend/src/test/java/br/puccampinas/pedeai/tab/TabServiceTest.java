package br.puccampinas.pedeai.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.session.GuestSessionRepository;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

class TabServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final TabRepository tabRepository = mock(TabRepository.class);
    private final GuestSessionRepository sessionRepository = mock(GuestSessionRepository.class);
    private final TableRepository tableRepository = mock(TableRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private final GuestSession caio = session("Caio");
    private final GuestSession ana = session("Ana");
    private TabService service;
    private Tab stored;

    @BeforeEach
    void setUp() {
        service = new TabService(tabRepository, sessionRepository, tableRepository, mongo,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(tableRepository.findById(tableId))
                .thenReturn(Optional.of(new Table(tableId, storeId, 5, null, 4, "t05", true, NOW)));
        when(tabRepository.insert(any(Tab.class))).thenAnswer(call -> stored = call.getArgument(0));
        when(tabRepository.save(any(Tab.class))).thenAnswer(call -> stored = call.getArgument(0));
        when(tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(eq(storeId), eq(tableId), eq("OPEN")))
                .thenAnswer(call -> stored == null ? List.of() : List.of(stored));
        when(tabRepository.findByStoreIdAndId(eq(storeId), any()))
                .thenAnswer(call -> Optional.ofNullable(stored).filter(tab -> tab.id().equals(call.getArgument(1))));
    }

    @Test
    void opensTabInTheNameOfTheSessionWithAFourDigitCodeThatExpiresInFiveMinutes() {
        TabResponse tab = service.open(guest(caio));

        assertTrue(tab.owner());
        assertEquals(5, tab.tableNumber());
        assertTrue(tab.joinCode().matches("\\d{4}"));
        assertEquals(NOW.plusSeconds(300), tab.joinCodeExpiresAt());
        assertEquals(caio.id(), stored.ownerSessionId());
        assertEquals("OPEN", stored.status());
        assertEquals(1, tab.members().size());
    }

    @Test
    void doesNotOpenASecondTabForTheSameSession() {
        service.open(guest(caio));

        assertThrows(ConflictException.class, () -> service.open(guest(caio)));
    }

    @Test
    void joinsWithTheRightCodeAndOnlyTheOwnerSeesTheCode() {
        TabResponse opened = service.open(guest(caio));

        TabResponse joined = service.join(guest(ana), opened.id(), opened.joinCode());

        assertFalse(joined.owner());
        assertNull(joined.joinCode());
        assertEquals(2, joined.members().size());
        assertEquals(2, service.listOnMyTable(guest(ana)).get(0).peopleCount());
    }

    @Test
    void rejectsWrongCode() {
        TabResponse opened = service.open(guest(caio));
        String wrong = opened.joinCode().equals("0000") ? "0001" : "0000";

        assertThrows(InvalidRequestException.class, () -> service.join(guest(ana), opened.id(), wrong));
    }

    @Test
    void rejectsExpiredCode() {
        TabResponse opened = service.open(guest(caio));
        stored = stored.withJoinCode(opened.joinCode(), NOW.minusSeconds(1));

        assertThrows(InvalidRequestException.class, () -> service.join(guest(ana), opened.id(), opened.joinCode()));
    }

    @Test
    void ownerGetsANewCodeWhenTheOldOneExpires() {
        service.open(guest(caio));
        stored = stored.withJoinCode("1234", NOW.minusSeconds(1));

        TabResponse tab = service.mine(guest(caio));

        assertEquals(NOW.plusSeconds(300), tab.joinCodeExpiresAt());
        assertEquals(tab.joinCode(), stored.joinCode());
    }

    @Test
    void onlyTheOwnerGeneratesANewCode() {
        TabResponse opened = service.open(guest(caio));
        service.join(guest(ana), opened.id(), opened.joinCode());

        assertThrows(ForbiddenException.class, () -> service.newCode(guest(ana), opened.id()));
        assertNotEquals(null, service.newCode(guest(caio), opened.id()).joinCode());
    }

    @Test
    void removedParticipantLosesAccessAndCannotComeBack() {
        TabResponse opened = service.open(guest(caio));
        service.join(guest(ana), opened.id(), opened.joinCode());

        TabResponse after = service.removeParticipant(guest(caio), opened.id(), ana.id().toHexString());

        assertEquals(1, after.members().size());
        assertThrows(ResourceNotFoundException.class, () -> service.mine(guest(ana)));
        String code = service.newCode(guest(caio), opened.id()).joinCode();
        assertThrows(ForbiddenException.class, () -> service.join(guest(ana), opened.id(), code));
    }

    @Test
    void onlyTheOwnerRemovesAndTheOwnerCannotBeRemoved() {
        TabResponse opened = service.open(guest(caio));
        service.join(guest(ana), opened.id(), opened.joinCode());

        assertThrows(ForbiddenException.class,
                () -> service.removeParticipant(guest(ana), opened.id(), caio.id().toHexString()));
        assertThrows(InvalidRequestException.class,
                () -> service.removeParticipant(guest(caio), opened.id(), caio.id().toHexString()));
    }

    @Test
    void itemsOfARemovedParticipantStayInTheirTotals() {
        TabResponse opened = service.open(guest(caio));
        service.join(guest(ana), opened.id(), opened.joinCode());
        Document order = new Document("items", List.of(
                new Document("placedBySessionId", ana.id()).append("unitPriceCents", 3200).append("quantity", 2)
                        .append("status", "PREPARING"),
                new Document("placedBySessionId", ana.id()).append("unitPriceCents", 999).append("quantity", 1)
                        .append("status", "CANCELED")));
        when(mongo.find(any(org.springframework.data.mongodb.core.query.Query.class), eq(Document.class), eq("order")))
                .thenReturn(List.of(order));

        TabResponse before = service.mine(guest(caio));
        assertEquals(6400, before.members().get(1).totalCents());

        service.removeParticipant(guest(caio), opened.id(), ana.id().toHexString());
        assertEquals(1, service.mine(guest(caio)).members().size());
        assertTrue(stored.participants().get(0).removedAt() != null);
    }

    @Test
    void rejectsExpiredSession() {
        GuestSession expired = new GuestSession(new ObjectId(), storeId, tableId, "TABLE", "Zé", null, null,
                NOW.minusSeconds(900), NOW.minusSeconds(1));
        when(sessionRepository.findById(expired.id())).thenReturn(Optional.of(expired));

        assertThrows(ForbiddenException.class, () -> service.listOnMyTable(guest(expired)));
    }

    private GuestSession session(String name) {
        GuestSession session = new GuestSession(new ObjectId(), storeId, tableId, "TABLE", name, null, null, NOW,
                NOW.plusSeconds(3600));
        when(sessionRepository.findById(session.id())).thenReturn(Optional.of(session));
        return session;
    }

    private AuthenticatedUser guest(GuestSession session) {
        return new AuthenticatedUser(session.id(), storeId, "GUEST");
    }
}
