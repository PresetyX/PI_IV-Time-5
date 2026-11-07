package br.puccampinas.pedeai.table;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.tab.Tab;
import br.puccampinas.pedeai.tab.TabRepository;

class TableManagementServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-07T23:00:00Z");

    private final TableRepository tableRepository = mock(TableRepository.class);
    private final TabRepository tabRepository = mock(TabRepository.class);
    private final ObjectId storeId = new ObjectId();
    private final List<Table> tables = new ArrayList<>();
    private TableManagementService service;
    private Table mesa5;
    private Table mesa7;

    @BeforeEach
    void setUp() {
        service = new TableManagementService(tableRepository, tabRepository, Clock.fixed(NOW, ZoneOffset.UTC));
        mesa5 = new Table(new ObjectId(), storeId, 5, "Varanda", 4, "t5-abcd", true, NOW.minusSeconds(3600));
        mesa7 = new Table(new ObjectId(), storeId, 7, null, 2, "t7-efgh", true, NOW.minusSeconds(3600));
        tables.add(mesa5);
        tables.add(mesa7);
        when(tableRepository.findByStoreIdOrderByNumberAsc(storeId)).thenAnswer(call -> List.copyOf(tables));
        when(tableRepository.findByStoreIdAndId(eq(storeId), any())).thenAnswer(call -> {
            ObjectId id = call.getArgument(1);
            return tables.stream().filter(t -> t.id().equals(id)).findFirst();
        });
        when(tableRepository.findByStoreIdAndNumber(eq(storeId), anyInt())).thenAnswer(call -> {
            int number = call.getArgument(1);
            return tables.stream().filter(t -> t.number() == number).findFirst();
        });
        when(tableRepository.findByStoreIdAndToken(eq(storeId), anyString())).thenAnswer(call -> {
            String token = call.getArgument(1);
            return tables.stream().filter(t -> t.token().equals(token)).findFirst();
        });
        when(tableRepository.insert(any(Table.class))).thenAnswer(call -> store(call.getArgument(0)));
        when(tableRepository.save(any(Table.class))).thenAnswer(call -> store(call.getArgument(0)));
        when(tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(any(), any(), eq("OPEN")))
                .thenReturn(List.of());
    }

    @Test
    void listsTablesInOrderWithOpenTabs() {
        when(tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(storeId, mesa5.id(), "OPEN"))
                .thenReturn(List.of(openTab(mesa5), openTab(mesa5)));

        List<ManagementTable> result = service.list(user("MANAGER"));

        assertEquals(List.of(5, 7), result.stream().map(ManagementTable::number).toList());
        assertEquals(List.of(2, 0), result.stream().map(ManagementTable::openTabs).toList());
    }

    @Test
    void createsActiveTableWithANewToken() {
        ManagementTable created = service.create(user("OWNER"), new TableRequest(12, "  Salão  ", 6));

        assertEquals(12, created.number());
        assertEquals("Salão", created.nickname());
        assertEquals(6, created.seats());
        assertTrue(created.active());
        assertEquals(NOW, created.createdAt());
        assertTrue(created.token().matches("t12-[a-z2-9]{8}"));
    }

    @Test
    void blankNicknameIsNotStored() {
        ManagementTable created = service.create(user("OWNER"), new TableRequest(12, "   ", null));

        assertNull(created.nickname());
        assertNull(created.seats());
    }

    @Test
    void tokenIsNeverRepeated() {
        when(tableRepository.existsByToken(anyString())).thenReturn(true, true, false);

        ManagementTable created = service.create(user("OWNER"), new TableRequest(12, null, null));

        assertTrue(created.token().startsWith("t12-"));
        verify(tableRepository, times(3)).existsByToken(anyString());
    }

    @Test
    void numberIsUniquePerStore() {
        assertThrows(ConflictException.class, () -> service.create(user("OWNER"), new TableRequest(5, null, null)));
        verify(tableRepository, never()).insert(any(Table.class));
    }

    @Test
    void updateKeepsTokenAndRejectsNumberOfAnotherTable() {
        ManagementTable saved = service.update(user("MANAGER"), mesa5.id().toHexString(), new TableRequest(5, "Janela", 2));

        assertEquals("t5-abcd", saved.token());
        assertEquals("Janela", saved.nickname());
        assertThrows(ConflictException.class,
                () -> service.update(user("MANAGER"), mesa5.id().toHexString(), new TableRequest(7, null, null)));
    }

    @Test
    void deactivatingTakesTheQrCodeDown() {
        TableService tableService = new TableService(tableRepository);
        assertEquals(mesa5.id(), tableService.getActiveByToken(storeId, "t5-abcd").id());

        ManagementTable saved = service.setActive(user("MANAGER"), mesa5.id().toHexString(), false);

        assertFalse(saved.active());
        assertThrows(ResourceNotFoundException.class, () -> tableService.getActiveByToken(storeId, "t5-abcd"));
        assertThrows(ResourceNotFoundException.class, () -> tableService.getActiveByNumber(storeId, 5));
    }

    @Test
    void reactivatingBringsTheSameQrCodeBack() {
        service.setActive(user("MANAGER"), mesa5.id().toHexString(), false);
        ManagementTable saved = service.setActive(user("MANAGER"), mesa5.id().toHexString(), true);

        assertTrue(saved.active());
        assertEquals("t5-abcd", saved.token());
        assertEquals(mesa5.id(), new TableService(tableRepository).getActiveByToken(storeId, "t5-abcd").id());
    }

    @Test
    void cannotDeactivateWithOpenTabs() {
        when(tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(storeId, mesa5.id(), "OPEN"))
                .thenReturn(List.of(openTab(mesa5)));

        assertThrows(ConflictException.class,
                () -> service.setActive(user("OWNER"), mesa5.id().toHexString(), false));
        verify(tableRepository, never()).save(any(Table.class));
    }

    @Test
    void newTokenInvalidatesTheOldQrCode() {
        ManagementTable saved = service.regenerateToken(user("OWNER"), mesa7.id().toHexString());

        assertNotEquals("t7-efgh", saved.token());
        assertTrue(saved.token().startsWith("t7-"));
        TableService tableService = new TableService(tableRepository);
        assertThrows(ResourceNotFoundException.class, () -> tableService.getActiveByToken(storeId, "t7-efgh"));
        assertEquals(mesa7.id(), tableService.getActiveByToken(storeId, saved.token()).id());
    }

    @Test
    void onlyOwnerAndManagerManageTables() {
        assertThrows(ForbiddenException.class, () -> service.list(user("WAITER")));
        assertThrows(ForbiddenException.class, () -> service.create(user("KITCHEN"), new TableRequest(20, null, null)));
    }

    @Test
    void tableFromAnotherStoreIsNotFound() {
        AuthenticatedUser other = new AuthenticatedUser(new ObjectId(), new ObjectId(), "OWNER");
        when(tableRepository.findByStoreIdAndId(eq(other.storeId()), any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.setActive(other, mesa5.id().toHexString(), false));
        assertThrows(ResourceNotFoundException.class, () -> service.regenerateToken(user("OWNER"), "abc"));
    }

    private Table store(Table table) {
        tables.removeIf(existing -> existing.id().equals(table.id()));
        tables.add(table);
        return table;
    }

    private Tab openTab(Table table) {
        return new Tab(new ObjectId(), storeId, table.id(), "TABLE", "Ana", new ObjectId(), "CUSTOMER", null, null,
                List.of(), "OPEN", 0, 0, 0, 0, 0, NOW);
    }

    private AuthenticatedUser user(String role) {
        return new AuthenticatedUser(new ObjectId(), storeId, role);
    }
}
