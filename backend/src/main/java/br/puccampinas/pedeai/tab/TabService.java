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
import org.springframework.data.mongodb.core.query.Update;
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
    // [Mateus · Card 5] Alteração: comanda de balcão (sessão sem mesa). Uma por pessoa; outras pessoas só entram com
    // o link da comanda e o código, porque não há mesa para listar.
    static final String MODE_COUNTER = "COUNTER";
    private static final String STATUS_OPEN = "OPEN";

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
        GuestSession session = guestSession(guest);
        return openTabs(session).stream()
                .map(tab -> new TabSummary(tab.id().toHexString(), tab.customerName(), 1 + activeParticipants(tab).size(),
                        tab.totalCents(), tab.openedAt(), isMember(tab, session.id())))
                .toList();
    }

    /** A comanda aberta de que o convidado faz parte, para quem precisa ler a conta dela. */
    public Tab requireMyTab(AuthenticatedUser guest) {
        return findMine(guestSession(guest)).orElseThrow(() -> new ResourceNotFoundException("You have no open tab"));
    }

    public TabResponse open(AuthenticatedUser guest) {
        GuestSession session = guestSession(guest);
        if (findMine(session).isPresent()) {
            throw new ConflictException("You already have a tab on this table");
        }
        Instant now = clock.instant();
        // [Mateus · Card 5] Alteração: sessão de balcão abre comanda COUNTER, sem mesa.
        Tab tab = tabRepository.insert(new Tab(new ObjectId(), session.storeId(), session.tableId(),
                isCounter(session) ? MODE_COUNTER : MODE_TABLE,
                session.name(), session.id(), "CUSTOMER", newCode(), now.plus(JOIN_CODE_DURATION), List.of(),
                STATUS_OPEN, 0, 0, 0, 0, 0, now));
        return view(tab, session);
    }

    public TabResponse mine(AuthenticatedUser guest) {
        GuestSession session = guestSession(guest);
        Tab tab = findMine(session).orElseThrow(() -> new ResourceNotFoundException("You have no open tab"));
        if (tab.ownerSessionId().equals(session.id()) && codeExpired(tab)) {
            tab = rotateCode(tab);
        }
        return view(tab, session);
    }

    public TabResponse join(AuthenticatedUser guest, String tabId, String code) {
        GuestSession session = guestSession(guest);
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
        return view(saveParticipants(tab, next), session);
    }

    public TabResponse newCode(AuthenticatedUser guest, String tabId) {
        GuestSession session = guestSession(guest);
        Tab tab = ownedTab(session, tabId);
        return view(rotateCode(tab), session);
    }

    public TabResponse removeParticipant(AuthenticatedUser guest, String tabId, String participantId) {
        GuestSession session = guestSession(guest);
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
        return view(saveParticipants(tab, next), session);
    }

    // [Mateus · Card 5] Alteração: antes era tableSession e recusava sessão sem mesa; agora aceita a de balcão.
    private GuestSession guestSession(AuthenticatedUser guest) {
        GuestSession session = sessionRepository.findById(guest.userId())
                .filter(found -> found.storeId().equals(guest.storeId()))
                .filter(found -> found.expiresAt().isAfter(clock.instant()))
                .orElseThrow(() -> new ForbiddenException("Session is no longer valid"));
        if (session.tableId() == null && !isCounter(session)) {
            throw new InvalidRequestException("This session is not tied to a table");
        }
        return session;
    }

    private static boolean isCounter(GuestSession session) {
        return MODE_COUNTER.equals(session.mode());
    }

    /** Mesa: as comandas abertas da mesa. Balcão: só as comandas de balcão de que a sessão faz parte. */
    private List<Tab> openTabs(GuestSession session) {
        if (isCounter(session)) {
            // [Mateus · Card 5] Alteração: no balcão não há mesa para listar as comandas dos outros.
            Query query = Query.query(Criteria.where("storeId").is(session.storeId()).and("mode").is(MODE_COUNTER)
                    .and("status").is(STATUS_OPEN).orOperator(Criteria.where("ownerSessionId").is(session.id()),
                            Criteria.where("participants.sessionId").is(session.id())))
                    .with(org.springframework.data.domain.Sort.by("openedAt"));
            return mongo.find(query, Tab.class);
        }
        return tabRepository.findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(
                session.storeId(), session.tableId(), STATUS_OPEN);
    }

    private java.util.Optional<Tab> findMine(GuestSession session) {
        return openTabs(session).stream().filter(tab -> isMember(tab, session.id())).findFirst();
    }

    private Tab tabOnMyTable(GuestSession session, String tabId) {
        return tabRepository.findByStoreIdAndId(session.storeId(), parseId(tabId))
                // [Mateus · Card 5] Alteração: no balcão vale qualquer comanda de balcão aberta da loja (precisa do código).
                .filter(tab -> STATUS_OPEN.equals(tab.status()) && (isCounter(session)
                        ? MODE_COUNTER.equals(tab.mode())
                        : session.tableId().equals(tab.tableId())))
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
        Tab next = tab.withJoinCode(newCode(), clock.instant().plus(JOIN_CODE_DURATION));
        return change(next, new Update().set("joinCode", next.joinCode()).set("joinCodeExpiresAt", next.joinCodeExpiresAt()));
    }

    private Tab saveParticipants(Tab tab, List<Tab.Participant> participants) {
        return change(tab.withParticipants(participants), new Update().set("participants", participants));
    }

    /**
     * Grava só os campos que mudaram. Salvar a comanda inteira apagaria o que outras partes gravam nela e o
     * {@link Tab} não conhece, como os chamados de garçom e a senha do balcão.
     */
    private Tab change(Tab next, Update update) {
        mongo.updateFirst(Query.query(Criteria.where("_id").is(next.id()).and("storeId").is(next.storeId())), update,
                Tab.class);
        return next;
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

        // [Mateus · Card 5] Alteração: comanda de balcão não tem mesa (tableNumber 0) e mostra a senha, se já tiver.
        int tableNumber = tab.tableId() == null ? 0
                : tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        return new TabResponse(tab.id().toHexString(), tableNumber, tab.customerName(), owner,
                owner ? tab.joinCode() : null, owner ? tab.joinCodeExpiresAt() : null,
                tab.totalCents(), tab.openedAt(), members, tab.mode(), pickupTicketOf(tab));
    }

    /** [Mateus · Card 5] Senha do balcão gravada na comanda pelo primeiro pedido; o {@link Tab} não tem o campo. */
    Integer pickupTicketOf(Tab tab) {
        if (!MODE_COUNTER.equals(tab.mode())) {
            return null;
        }
        Document doc = mongo.findOne(Query.query(Criteria.where("_id").is(tab.id()).and("storeId").is(tab.storeId())),
                Document.class, "tab");
        return doc != null && doc.get("pickupTicket") instanceof Number number ? number.intValue() : null;
    }

    /** Soma o que cada sessão pediu. Itens de quem saiu da comanda continuam contando no total. */
    private Map<ObjectId, Integer> totalsBySession(Tab tab) {
        Map<ObjectId, Integer> totals = new HashMap<>();
        Query query = Query.query(Criteria.where("storeId").is(tab.storeId()).and("tabId").is(tab.id())
                // [Mateus · Card 4] Alteração: ignora CANCELLED (dois L, como o pedido é gravado) além de CANCELED.
                .and("status").nin(TabTotals.IGNORED_STATUS));
        for (Document order : mongo.find(query, Document.class, "order")) {
            List<?> items = order.get("items", List.class);
            if (items == null) {
                continue;
            }
            for (Object raw : items) {
                if (!(raw instanceof Document item) || TabTotals.IGNORED_STATUS.contains(item.getString("status"))
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
