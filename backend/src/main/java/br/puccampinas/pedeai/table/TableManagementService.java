package br.puccampinas.pedeai.table;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.List;
import java.util.Set;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.tab.TabRepository;

@Service
public class TableManagementService {

    static final Set<String> ROLES = Set.of("OWNER", "MANAGER");
    private static final String OPEN = "OPEN";
    private static final String ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
    private static final int TOKEN_LENGTH = 8;

    private final TableRepository tableRepository;
    private final TabRepository tabRepository;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public TableManagementService(TableRepository tableRepository, TabRepository tabRepository, Clock clock) {
        this.tableRepository = tableRepository;
        this.tabRepository = tabRepository;
        this.clock = clock;
    }

    public List<ManagementTable> list(AuthenticatedUser user) {
        requireRole(user);
        return tableRepository.findByStoreIdOrderByNumberAsc(user.storeId()).stream()
                .map(table -> ManagementTable.of(table, openTabs(table)))
                .toList();
    }

    public ManagementTable create(AuthenticatedUser user, TableRequest request) {
        requireRole(user);
        requireFreeNumber(user.storeId(), request.number(), null);
        Table created = tableRepository.insert(new Table(new ObjectId(), user.storeId(), request.number(),
                blankToNull(request.nickname()), request.seats(), newToken(request.number()), true, clock.instant()));
        return ManagementTable.of(created, 0);
    }

    public ManagementTable update(AuthenticatedUser user, String tableId, TableRequest request) {
        requireRole(user);
        Table current = find(user, tableId);
        requireFreeNumber(user.storeId(), request.number(), current.id());
        Table saved = tableRepository.save(new Table(current.id(), current.storeId(), request.number(),
                blankToNull(request.nickname()), request.seats(), current.token(), current.active(),
                current.createdAt()));
        return ManagementTable.of(saved, openTabs(saved));
    }

    public ManagementTable setActive(AuthenticatedUser user, String tableId, boolean active) {
        requireRole(user);
        Table current = find(user, tableId);
        int open = openTabs(current);
        if (current.active() == active) {
            return ManagementTable.of(current, open);
        }
        if (!active && open > 0) {
            throw new ConflictException("A mesa " + current.number() + " tem " + open
                    + (open == 1 ? " comanda aberta" : " comandas abertas") + ". Feche antes de desativar.");
        }
        Table saved = tableRepository.save(new Table(current.id(), current.storeId(), current.number(),
                current.nickname(), current.seats(), current.token(), active, current.createdAt()));
        return ManagementTable.of(saved, open);
    }

    public ManagementTable regenerateToken(AuthenticatedUser user, String tableId) {
        requireRole(user);
        Table current = find(user, tableId);
        Table saved = tableRepository.save(new Table(current.id(), current.storeId(), current.number(),
                current.nickname(), current.seats(), newToken(current.number()), current.active(),
                current.createdAt()));
        return ManagementTable.of(saved, openTabs(saved));
    }

    private Table find(AuthenticatedUser user, String tableId) {
        if (tableId == null || !ObjectId.isValid(tableId)) {
            throw new ResourceNotFoundException("Mesa não encontrada.");
        }
        return tableRepository.findByStoreIdAndId(user.storeId(), new ObjectId(tableId))
                .orElseThrow(() -> new ResourceNotFoundException("Mesa não encontrada."));
    }

    private int openTabs(Table table) {
        return tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(table.storeId(), table.id(), OPEN)
                .size();
    }

    private void requireFreeNumber(ObjectId storeId, int number, ObjectId ignore) {
        tableRepository.findByStoreIdAndNumber(storeId, number)
                .filter(other -> !other.id().equals(ignore))
                .ifPresent(other -> {
                    throw new ConflictException("Já existe a mesa " + number + ".");
                });
    }

    private String newToken(int number) {
        String token;
        do {
            StringBuilder builder = new StringBuilder("t").append(number).append('-');
            for (int index = 0; index < TOKEN_LENGTH; index++) {
                builder.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
            }
            token = builder.toString();
        } while (tableRepository.existsByToken(token));
        return token;
    }

    private static void requireRole(AuthenticatedUser user) {
        if (user == null || !ROLES.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
