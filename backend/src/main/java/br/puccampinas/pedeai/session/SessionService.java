package br.puccampinas.pedeai.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.IssuedToken;
import br.puccampinas.pedeai.auth.JwtService;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;
import br.puccampinas.pedeai.table.Table;
import br.puccampinas.pedeai.table.TableRepository;

@Service
public class SessionService {

    static final Duration SESSION_DURATION = Duration.ofHours(4);
    private static final String MODE_TABLE = "TABLE";

    private final StoreRepository storeRepository;
    private final TableRepository tableRepository;
    private final GuestSessionRepository sessionRepository;
    private final JwtService jwtService;
    private final Clock clock;

    public SessionService(StoreRepository storeRepository, TableRepository tableRepository,
            GuestSessionRepository sessionRepository, JwtService jwtService, Clock clock) {
        this.storeRepository = storeRepository;
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.jwtService = jwtService;
        this.clock = clock;
    }

    public SessionResponse open(String slug, OpenSessionRequest request) {
        Store store = storeRepository.findBySlug(slug)
                .filter(Store::active)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found: " + slug));
        Table table = tableRepository.findByToken(request.tableToken())
                .filter(found -> found.storeId().equals(store.id()) && found.active())
                .orElseThrow(() -> new ResourceNotFoundException("Table not found"));

        if (store.serviceModes() != null && !store.serviceModes().contains(MODE_TABLE)) {
            throw new ConflictException("Store does not accept table service");
        }
        String phone = request.phone() == null ? "" : request.phone().trim();
        if (Boolean.TRUE.equals(store.requireCustomerPhone()) && phone.isEmpty()) {
            throw new InvalidRequestException("phone: is required by this store");
        }

        Instant now = clock.instant();
        GuestSession session = sessionRepository.insert(new GuestSession(
                new ObjectId(), store.id(), table.id(), MODE_TABLE, request.name().trim(),
                phone.isEmpty() ? null : phone, now, now.plus(SESSION_DURATION)));

        IssuedToken token = jwtService.issueGuest(session);
        return new SessionResponse(token.value(), "Bearer", token.expiresAt(),
                new SessionResponse.SessionInfo(session.id().toHexString(), store.id().toHexString(),
                        table.id().toHexString(), table.number(), session.name()));
    }
}
