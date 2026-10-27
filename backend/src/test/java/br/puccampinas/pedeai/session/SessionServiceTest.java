package br.puccampinas.pedeai.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.store.OpeningStatus;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreService;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableService;

class SessionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");
    private static final OpeningStatus OPEN = new OpeningStatus(true, true, false, "23:30", "23:00", null);
    private static final OpeningStatus CLOSED = new OpeningStatus(false, false, false, null, null, null);

    private final StoreService storeService = mock(StoreService.class);
    private final TableService tableService = mock(TableService.class);
    private final GuestSessionRepository sessionRepository = mock(GuestSessionRepository.class);
    private final ObjectId storeId = new ObjectId();
    private final Table table = new Table(new ObjectId(), storeId, 5, "Varanda", 4, "t05-1d3e", true, NOW);
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService(storeService, tableService, sessionRepository,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(sessionRepository.save(any())).thenAnswer(invocation -> {
            GuestSession session = invocation.getArgument(0);
            return new GuestSession(new ObjectId(), session.storeId(), session.tableId(), session.mode(),
                    session.name(), session.phone(), session.consent(), session.createdAt(), session.expiresAt());
        });
    }

    @Test
    void createsTableSessionWithNormalizedPhoneAndConsent() {
        givenStore(true, OPEN);
        when(tableService.getActiveByToken(storeId, "t05-1d3e")).thenReturn(table);

        SessionResponse response = sessionService.create(
                new CreateSessionRequest("demo", "TABLE", "t05-1d3e", "  Ana ", "(19) 99999-0000"));

        ArgumentCaptor<GuestSession> saved = ArgumentCaptor.forClass(GuestSession.class);
        verify(sessionRepository).save(saved.capture());
        assertEquals("Ana", saved.getValue().name());
        assertEquals("19999990000", saved.getValue().phone());
        assertEquals(table.id(), saved.getValue().tableId());
        assertTrue(saved.getValue().consent().notifyCustomer());
        assertEquals(NOW.plus(SessionService.SESSION_DURATION), saved.getValue().expiresAt());
        assertEquals(5, response.table().number());
        assertEquals("TABLE", response.mode());
    }

    @Test
    void phoneIsOptionalWhenStoreDoesNotRequireIt() {
        givenStore(false, OPEN);
        when(tableService.getActiveByToken(storeId, "t05-1d3e")).thenReturn(table);

        sessionService.create(new CreateSessionRequest("demo", "TABLE", "t05-1d3e", "Ana", ""));

        ArgumentCaptor<GuestSession> saved = ArgumentCaptor.forClass(GuestSession.class);
        verify(sessionRepository).save(saved.capture());
        assertNull(saved.getValue().phone());
    }

    @Test
    void phoneIsRequiredWhenStoreAsksForIt() {
        givenStore(true, OPEN);
        when(tableService.getActiveByToken(storeId, "t05-1d3e")).thenReturn(table);

        assertThrows(InvalidRequestException.class, () -> sessionService.create(
                new CreateSessionRequest("demo", "TABLE", "t05-1d3e", "Ana", null)));
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void invalidPhoneIsRejected() {
        givenStore(false, OPEN);
        when(tableService.getActiveByToken(storeId, "t05-1d3e")).thenReturn(table);

        assertThrows(InvalidRequestException.class, () -> sessionService.create(
                new CreateSessionRequest("demo", "TABLE", "t05-1d3e", "Ana", "1234")));
    }

    @Test
    void tableModeNeedsAToken() {
        givenStore(false, OPEN);

        assertThrows(InvalidRequestException.class, () -> sessionService.create(
                new CreateSessionRequest("demo", "TABLE", null, "Ana", null)));
    }

    @Test
    void unknownOrInactiveTableIsNotFound() {
        givenStore(false, OPEN);
        when(tableService.getActiveByToken(storeId, "old")).thenThrow(new ResourceNotFoundException("x"));

        assertThrows(ResourceNotFoundException.class, () -> sessionService.create(
                new CreateSessionRequest("demo", "TABLE", "old", "Ana", null)));
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void closedStoreRejectsNewSessions() {
        givenStore(false, CLOSED);

        assertThrows(ConflictException.class, () -> sessionService.create(
                new CreateSessionRequest("demo", "TABLE", "t05-1d3e", "Ana", null)));
        verify(sessionRepository, never()).save(any());
    }

    private void givenStore(boolean requirePhone, OpeningStatus status) {
        Store store = new Store(storeId, "demo", "Demo", null, null, null, null, null, "#D62F1F", null, List.of(),
                List.of("TABLE"), 1000, 500, requirePhone, null, null, false, true, null, null);
        when(storeService.getActiveStore("demo")).thenReturn(store);
        when(storeService.getStatus(store)).thenReturn(status);
    }
}
