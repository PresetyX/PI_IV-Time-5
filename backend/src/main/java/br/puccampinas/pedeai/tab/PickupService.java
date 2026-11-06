package br.puccampinas.pedeai.tab;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.session.GuestSessionRepository;

/**
 * [Mateus · Card 5] Senha do balcão do cliente: a comanda de balcão mais recente da sessão, aberta ou já fechada,
 * para a tela continuar mostrando "Retirada confirmada" depois que a comanda fecha sozinha.
 */
@Service
public class PickupService {

    private final GuestSessionRepository sessionRepository;
    private final MongoTemplate mongo;
    private final Clock clock;

    public PickupService(GuestSessionRepository sessionRepository, MongoTemplate mongo, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.mongo = mongo;
        this.clock = clock;
    }

    public PickupResponse mine(AuthenticatedUser guest) {
        GuestSession session = sessionRepository.findById(guest.userId())
                .filter(found -> found.storeId().equals(guest.storeId()))
                .filter(found -> found.expiresAt().isAfter(clock.instant()))
                .orElseThrow(() -> new ForbiddenException("Session is no longer valid"));

        Query ofSession = Query.query(Criteria.where("storeId").is(session.storeId()).and("mode")
                .is(TabService.MODE_COUNTER).orOperator(Criteria.where("ownerSessionId").is(session.id()),
                        Criteria.where("participants.sessionId").is(session.id())))
                .with(Sort.by(Sort.Direction.DESC, "openedAt")).limit(1);
        Document tab = mongo.findOne(ofSession, Document.class, "tab");
        if (tab == null) {
            throw new ResourceNotFoundException("You have no counter tab");
        }

        List<PickupResponse.Order> orders = mongo.find(Query.query(Criteria.where("storeId").is(session.storeId())
                .and("tabId").is(tab.getObjectId("_id"))).with(Sort.by(Sort.Direction.ASC, "createdAt")),
                Document.class, "order").stream().map(PickupService::order).toList();

        return new PickupResponse(tab.getObjectId("_id").toHexString(), integer(tab.get("pickupTicket")),
                tab.getString("status"), tab.getString("customerName"), TabTotals.number(tab, "totalCents"),
                TabTotals.number(tab, "paidCents"), orders);
    }

    private static PickupResponse.Order order(Document order) {
        List<PickupResponse.Line> lines = order.getList("items", Document.class, List.of()).stream()
                .map(item -> new PickupResponse.Line(item.getString("nameSnapshot"), TabTotals.number(item, "quantity"),
                        OrderOptions.fromItem(item).stream().map(PlaceOrderRequest.SelectedOption::label).toList(),
                        item.getString("status")))
                .toList();
        Instant createdAt = order.getDate("createdAt") == null ? null : order.getDate("createdAt").toInstant();
        return new PickupResponse.Order(order.getObjectId("_id").toHexString(), TabTotals.number(order, "number"),
                order.getString("status"), TabTotals.number(order, "totalCents"), createdAt, lines);
    }

    private static Integer integer(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }
}
