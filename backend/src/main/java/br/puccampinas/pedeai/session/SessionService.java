package br.puccampinas.pedeai.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreService;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableResponse;
import br.puccampinas.pedeai.table.TableService;

@Service
public class SessionService {

    public static final Duration SESSION_DURATION = Duration.ofHours(4);
    private static final String TABLE_MODE = "TABLE";

    private final StoreService storeService;
    private final TableService tableService;
    private final GuestSessionRepository sessionRepository;
    private final Clock clock;

    public SessionService(StoreService storeService, TableService tableService,
            GuestSessionRepository sessionRepository, Clock clock) {
        this.storeService = storeService;
        this.tableService = tableService;
        this.sessionRepository = sessionRepository;
        this.clock = clock;
    }

    public SessionResponse create(CreateSessionRequest request) {
        Store store = storeService.getActiveStore(request.storeSlug());
        if (!storeService.getStatus(store).acceptingOrders()) {
            throw new ConflictException("Store is not accepting orders now");
        }

        Table table = null;
        if (TABLE_MODE.equals(request.mode())) {
            if (request.tableToken() == null || request.tableToken().isBlank()) {
                throw new InvalidRequestException("tableToken is required for TABLE mode");
            }
            table = tableService.getActiveByToken(store.id(), request.tableToken());
        }

        String phone = normalizePhone(request.phone());
        if (phone == null && Boolean.TRUE.equals(store.requireCustomerPhone())) {
            throw new InvalidRequestException("phone is required by this store");
        }

        Instant now = clock.instant();
        GuestSession session = sessionRepository.save(new GuestSession(
                null,
                store.id(),
                table == null ? null : table.id(),
                request.mode(),
                request.name().trim(),
                phone,
                new GuestSession.Consent(phone != null, false, now),
                now,
                now.plus(SESSION_DURATION)));

        return new SessionResponse(
                session.id().toHexString(),
                session.mode(),
                session.name(),
                table == null ? null : TableResponse.of(table),
                session.expiresAt());
    }

    private static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 10 || digits.length() > 11) {
            throw new InvalidRequestException("phone must have 10 or 11 digits with area code");
        }
        return digits;
    }
}
