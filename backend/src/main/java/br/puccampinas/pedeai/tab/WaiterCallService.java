package br.puccampinas.pedeai.tab;

import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

/**
 * Chamados de garçom, gravados dentro da comanda em {@code waiterCalls}, que é onde o painel do salão já lê.
 * O {@code reason} vai em português porque o salão mostra o texto como está.
 */
@Service
public class WaiterCallService {

    static final Map<String, String> REASONS = Map.of(
            "CLOSE_BILL", "Fechar a conta",
            "QUESTION", "Tirar uma dúvida",
            "MISSING_ITEM", "Faltou algo na mesa",
            "ORDER_PROBLEM", "Problema no pedido",
            "PIX_SENT", "Conferir o Pix");
    static final String OPEN = "OPEN";
    static final String RESOLVED = "RESOLVED";
    private static final Set<String> STAFF = Set.of("OWNER", "MANAGER", "WAITER");

    private final TabService tabService;
    private final MongoTemplate mongo;
    private final Clock clock;

    public WaiterCallService(TabService tabService, MongoTemplate mongo, Clock clock) {
        this.tabService = tabService;
        this.mongo = mongo;
        this.clock = clock;
    }

    /** Um chamado aberto com o mesmo motivo não se repete: devolve o que já está esperando o garçom. */
    public WaiterCallResponse call(AuthenticatedUser guest, String type) {
        String reason = REASONS.get(type);
        if (reason == null) {
            throw new InvalidRequestException("type must be one of " + REASONS.keySet());
        }
        Tab tab = tabService.requireMyTab(guest);
        Document waiting = callsOf(tab).stream()
                .filter(call -> OPEN.equals(call.getString("status")) && type.equals(call.getString("type")))
                .findFirst().orElse(null);
        if (waiting != null) {
            return view(waiting);
        }

        Document call = new Document("id", new ObjectId().toHexString())
                .append("type", type)
                .append("reason", reason)
                .append("status", OPEN)
                .append("bySessionId", guest.userId())
                .append("createdAt", Date.from(clock.instant()));
        mongo.updateFirst(Query.query(Criteria.where("_id").is(tab.id()).and("storeId").is(tab.storeId())),
                new Update().push("waiterCalls", call), "tab");
        return view(call);
    }

    public List<WaiterCallResponse> callsOfMyTab(AuthenticatedUser guest) {
        return callsOf(tabService.requireMyTab(guest)).stream().map(WaiterCallService::view).toList();
    }

    public WaiterCallResponse resolve(AuthenticatedUser staff, String tabId, String callId) {
        if (staff == null || !STAFF.contains(staff.role())) {
            throw new ForbiddenException("Seu perfil não permite atender chamados.");
        }
        if (!ObjectId.isValid(tabId)) {
            throw new InvalidRequestException("Invalid identifier");
        }
        Query query = Query.query(Criteria.where("_id").is(new ObjectId(tabId)).and("storeId").is(staff.storeId())
                .and("waiterCalls").elemMatch(Criteria.where("id").is(callId).and("status").is(OPEN)));
        Instant now = clock.instant();
        boolean changed = mongo.updateFirst(query, new Update()
                .set("waiterCalls.$.status", RESOLVED)
                .set("waiterCalls.$.resolvedAt", Date.from(now))
                .set("waiterCalls.$.resolvedBy", staff.userId()), "tab").getModifiedCount() > 0;
        if (!changed) {
            Document tab = mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(tabId))
                    .and("storeId").is(staff.storeId())), Document.class, "tab");
            boolean exists = tab != null && tab.getList("waiterCalls", Document.class, List.of()).stream()
                    .anyMatch(call -> callId.equals(call.getString("id")));
            if (!exists) {
                throw new ResourceNotFoundException("Call not found");
            }
            throw new ConflictException("This call was already answered");
        }
        return new WaiterCallResponse(callId, null, null, RESOLVED, null, now);
    }

    private List<Document> callsOf(Tab tab) {
        Document stored = mongo.findOne(Query.query(Criteria.where("_id").is(tab.id()).and("storeId").is(tab.storeId())),
                Document.class, "tab");
        return stored == null ? List.of() : stored.getList("waiterCalls", Document.class, List.of());
    }

    private static WaiterCallResponse view(Document call) {
        Date resolvedAt = call.getDate("resolvedAt");
        return new WaiterCallResponse(call.getString("id"), call.getString("type"), call.getString("reason"),
                call.getString("status"), call.getDate("createdAt").toInstant(),
                resolvedAt == null ? null : resolvedAt.toInstant());
    }
}
