package br.puccampinas.pedeai.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import br.puccampinas.pedeai.auth.IssuedToken;
import br.puccampinas.pedeai.auth.JwtService;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

class SessionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T12:00:00Z");

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final TableRepository tableRepository = mock(TableRepository.class);
    private final GuestSessionRepository sessionRepository = mock(GuestSessionRepository.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId tableId = new ObjectId();
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        sessionService = new SessionService(storeRepository, tableRepository, sessionRepository, jwtService, clock);
        when(sessionRepository.insert(any(GuestSession.class))).thenAnswer(call -> call.getArgument(0));
        when(jwtService.issueGuest(any())).thenReturn(new IssuedToken("guest-jwt", NOW.plusSeconds(14400)));
    }

    @Test
    void opensSessionForTheTableAndIssuesGuestToken() {
        givenStore(true, List.of("TABLE"), false);
        givenTable(storeId, true);

        SessionResponse response = sessionService.open("demo", new OpenSessionRequest("qr-5", "  Ana ", "  "));

        ArgumentCaptor<GuestSession> saved = ArgumentCaptor.forClass(GuestSession.class);
        verify(sessionRepository).insert(saved.capture());
        assertEquals(storeId, saved.getValue().storeId());
        assertEquals(tableId, saved.getValue().tableId());
        assertEquals("TABLE", saved.getValue().mode());
        assertEquals("Ana", saved.getValue().name());
        assertNull(saved.getValue().phone());
        assertEquals(NOW, saved.getValue().createdAt());
        assertEquals(NOW.plus(SessionService.SESSION_DURATION), saved.getValue().expiresAt());

        assertEquals("guest-jwt", response.token());
        assertEquals("Bearer", response.tokenType());
        assertEquals(5, response.session().tableNumber());
        assertEquals(tableId.toHexString(), response.session().tableId());
    }

    @Test
    void unknownStoreIsNotFound() {
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", null)));
    }

    @Test
    void inactiveStoreIsNotFound() {
        givenStore(false, List.of("TABLE"), false);

        assertThrows(ResourceNotFoundException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", null)));
    }

    @Test
    void tableFromAnotherStoreIsNotFound() {
        givenStore(true, List.of("TABLE"), false);
        givenTable(new ObjectId(), true);

        assertThrows(ResourceNotFoundException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", null)));
        verify(sessionRepository, never()).insert(any(GuestSession.class));
    }

    @Test
    void inactiveTableIsNotFound() {
        givenStore(true, List.of("TABLE"), false);
        givenTable(storeId, false);

        assertThrows(ResourceNotFoundException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", null)));
    }

    @Test
    void storeWithoutTableServiceConflicts() {
        givenStore(true, List.of("COUNTER"), false);
        givenTable(storeId, true);

        assertThrows(ConflictException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", null)));
    }

    @Test
    void phoneIsRequiredWhenTheStoreAsksForIt() {
        givenStore(true, List.of("TABLE"), true);
        givenTable(storeId, true);

        assertThrows(InvalidRequestException.class,
                () -> sessionService.open("demo", new OpenSessionRequest("qr-5", "Ana", " ")));
        verify(sessionRepository, never()).insert(any(GuestSession.class));
    }

    private void givenStore(boolean active, List<String> serviceModes, boolean requirePhone) {
        Store store = new Store(storeId, "demo", "Demo", null, null, null, null, null, "#D62F1F", null, null,
                serviceModes, 1000, 500, requirePhone, null, null, false, active, NOW, NOW);
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store));
    }

    private void givenTable(ObjectId owner, boolean active) {
        when(tableRepository.findByToken("qr-5"))
                .thenReturn(Optional.of(new Table(tableId, owner, 5, null, 4, "qr-5", active, NOW)));
    }
}
