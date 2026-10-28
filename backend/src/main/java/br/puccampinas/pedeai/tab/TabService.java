package br.puccampinas.pedeai.tab;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.session.GuestSessionRepository;
import br.puccampinas.pedeai.table.TableRepository;

@Service
public class TabService {

    public static final Duration JOIN_CODE_DURATION = Duration.ofMinutes(5);
    private static final String MODE_TABLE = "TABLE";
    private static final String STATUS_OPEN = "OPEN";
    private static final String CANCELED = "CANCELED";

    private final TabRepository tabRepository;
    private final GuestSessionRepository sessionRepository;
    private final TableRepository tableRepository;
    private final MongoTemplate mongo;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public TabService(TabRepository tabRepository, GuestSessionRepository sessionRepository,
            TableRepository tableRepository, MongoTemplate mongo, Clock clock) {
        this.tabRepository = tabRepository;
        this.sessionRepository = sessionRepository;
        this.tableRepository = tableRepository;
        this.mongo = mongo;
        this.clock = clock;
    }

    public List<TabSummary> listOnMyTable(AuthenticatedUser guest) {
        GuestSession session = tableSession(guest);
        return openTabs(session).stream()
                .map(tab -> new TabSummary(tab.id().toHexString(), tab.customerName(), 1 + activeParticipants(tab).size(),
                        tab.totalCents(), tab.openedAt(), isMember(tab, session.id())))
                .toList();
    }

    /** A comanda aberta de que o convidado faz parte, para quem precisa ler a conta dela. */
    public Tab requireMyTab(AuthenticatedUser guest) {
        return findMine(tableSession(guest)).orElseThrow(() -> new ResourceNotFoundException("You have no open tab"));
    }

    public TabResponse open(AuthenticatedUser guest) {
        GuestSession session = tableSession(guest);
        if (findMine(session).isPresent()) {
            throw new ConflictException("You already have a tab on this table");
        }
        Instant now = clock.instant();
        Tab tab = tabRepository.insert(new Tab(new ObjectId(), session.storeId(), session.tableId(), MODE_TABLE,
                session.name(), session.id(), "CUSTOMER", newCode(), now.plus(JOIN_CODE_DURATION), List.of(),
                STATUS_OPEN, 0, 0, 0, 0, 0, now));
        return view(tab, session);
    }

    public TabResponse mine(AuthenticatedUser guest) {
        GuestSession session = tableSession(guest);
        Tab tab = findMine(session).orElseThrow(() -> new ResourceNotFoundException("You have no open tab"));
        if (tab.ownerSessionId().equals(session.id()) && codeExpired(tab)) {
            tab = rotateCode(tab);
        }
        return view(tab, session);
    }

    public TabResponse join(AuthenticatedUser guest, String tabId, String code) {
        GuestSession session = tableSession(guest);
        Tab tab = tabOnMyTable(session, tabId);
        if (isMember(tab, session.id())) {
            return view(tab, session);
        }
        boolean removed = tab.participantsOrEmpty().stream()
                .anyMatch(p -> p.sessionId().equals(session.id()) && !p.active());
        if (removed) {
            throw new ForbiddenException("You were removed from this tab");
        }
        if (findMine(session).isPresent()) {
            throw new ConflictException("You are already in another tab on this table");
        }
        if (codeExpired(tab) || !code.equals(tab.joinCode())) {
            throw new InvalidRequestException("Code is invalid or has expired");
        }
        List<Tab.Participant> next = new ArrayList<>(tab.participantsOrEmpty());
        next.add(new Tab.Participant(session.id(), session.name(), clock.instant(), null));
        return view(tabRepository.save(tab.withParticipants(next)), session);
    }

    public TabResponse newCode(AuthenticatedUser guest, String tabId) {
        GuestSession session = tableSession(guest);
        Tab tab = ownedTab(session, tabId);
        return view(rotateCode(tab), session);
    }

    public TabResponse removeParticipant(AuthenticatedUser guest, String tabId, String participantId) {
        GuestSession session = tableSession(guest);
        Tab tab = ownedTab(session, tabId);
        ObjectId target = parseId(participantId);
        if (target.equals(tab.ownerSessionId())) {
            throw new InvalidRequestException("The owner cannot be removed from the tab");
        }
        boolean found = tab.participantsOrEmpty().stream()
                .anyMatch(p -> p.sessionId().equals(target) && p.active());
        if (!found) {
            throw new ResourceNotFoundException("Participant not found");
        }
        Instant now = clock.instant();
        List<Tab.Participant> next = tab.participantsOrEmpty().stream()
                .map(p -> p.sessionId().equals(target) && p.active()
                        ? new Tab.Participant(p.sessionId(), p.name(), p.joinedAt(), now)
                        : p)
                .toList();
        return view(tabRepository.save(tab.withParticipants(next)), session);
    }

    private GuestSession tableSession(AuthenticatedUser guest) {
        GuestSession session = sessionRepository.findById(guest.userId())
                .filter(found -> found.storeId().equals(guest.storeId()))
                .filter(found -> found.expiresAt().isAfter(clock.instant()))
                .orElseThrow(() -> new ForbiddenException("Session is no longer valid"));
        if (session.tableId() == null) {
            throw new InvalidRequestException("This session is not tied to a table");
        }
        return session;
    }

    private List<Tab> openTabs(GuestSession session) {
        return tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(
                session.storeId(), session.tableId(), STATUS_OPEN);
    }

    private java.util.Optional<Tab> findMine(GuestSession session) {
        return openTabs(session).stream().filter(tab -> isMember(tab, session.id())).findFirst();
    }

    private Tab tabOnMyTable(GuestSession session, String tabId) {
        return tabRepository.findByStoreIdAndId(session.storeId(), parseId(tabId))
                .filter(tab -> STATUS_OPEN.equals(tab.status()) && session.tableId().equals(tab.tableId()))
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found"));
    }

    private Tab ownedTab(GuestSession session, String tabId) {
        Tab tab = tabOnMyTable(session, tabId);
        if (!tab.ownerSessionId().equals(session.id())) {
            throw new ForbiddenException("Only who opened the tab can do this");
        }
        return tab;
    }

    private Tab rotateCode(Tab tab) {
        return tabRepository.save(tab.withJoinCode(newCode(), clock.instant().plus(JOIN_CODE_DURATION)));
    }

    private boolean codeExpired(Tab tab) {
        return tab.joinCode() == null || tab.joinCodeExpiresAt() == null
                || !tab.joinCodeExpiresAt().isAfter(clock.instant());
    }

    private String newCode() {
        return String.format("%04d", random.nextInt(10000));
    }

    private static boolean isMember(Tab tab, ObjectId sessionId) {
        return tab.ownerSessionId().equals(sessionId)
                || activeParticipants(tab).stream().anyMatch(p -> p.sessionId().equals(sessionId));
    }

    private static List<Tab.Participant> activeParticipants(Tab tab) {
        return tab.participantsOrEmpty().stream().filter(Tab.Participant::active).toList();
    }

    private static ObjectId parseId(String value) {
        if (!ObjectId.isValid(value)) {
            throw new InvalidRequestException("Invalid identifier");
        }
        return new ObjectId(value);
    }

    private TabResponse view(Tab tab, GuestSession viewer) {
        boolean owner = tab.ownerSessionId().equals(viewer.id());
        Map<ObjectId, Integer> totals = totalsBySession(tab);

        List<TabResponse.Member> members = new ArrayList<>();
        members.add(new TabResponse.Member(tab.ownerSessionId().toHexString(), tab.customerName(), true,
                totals.getOrDefault(tab.ownerSessionId(), 0), tab.openedAt()));
        for (Tab.Participant participant : activeParticipants(tab)) {
            members.add(new TabResponse.Member(participant.sessionId().toHexString(), participant.name(), false,
                    totals.getOrDefault(participant.sessionId(), 0), participant.joinedAt()));
        }

        int tableNumber = tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        return new TabResponse(tab.id().toHexString(), tableNumber, tab.customerName(), owner,
                owner ? tab.joinCode() : null, owner ? tab.joinCodeExpiresAt() : null,
                tab.totalCents(), tab.openedAt(), members);
    }

    /** Soma o que cada sessão pediu. Itens de quem saiu da comanda continuam contando no total. */
    private Map<ObjectId, Integer> totalsBySession(Tab tab) {
        Map<ObjectId, Integer> totals = new HashMap<>();
        Query query = Query.query(Criteria.where("storeId").is(tab.storeId()).and("tabId").is(tab.id())
                .and("status").ne(CANCELED));
        for (Document order : mongo.find(query, Document.class, "order")) {
            List<?> items = order.get("items", List.class);
            if (items == null) {
                continue;
            }
            for (Object raw : items) {
                if (!(raw instanceof Document item) || CANCELED.equals(item.getString("status"))
                        || !(item.get("placedBySessionId") instanceof ObjectId placedBy)) {
                    continue;
                }
                int line = item.get("unitPriceCents", Number.class).intValue()
                        * item.get("quantity", Number.class).intValue();
                totals.merge(placedBy, line, Integer::sum);
            }
        }
        return totals;
    }
}
