package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.table.TableRepository;

@Service
public class BillService {

    static final int SERVICE_FEE_PERCENT = 10;
    static final String STAFF_ID = "staff";
    static final String STAFF_NAME = "Garçom";

    private final TabService tabService;
    private final TableRepository tableRepository;
    private final MongoTemplate mongo;

    public BillService(TabService tabService, TableRepository tableRepository, MongoTemplate mongo) {
        this.tabService = tabService;
        this.tableRepository = tableRepository;
        this.mongo = mongo;
    }

    public BillResponse billOfMyTab(AuthenticatedUser guest) {
        Tab tab = tabService.requireMyTab(guest);
        Query query = Query.query(Criteria.where("storeId").is(tab.storeId()).and("tabId").is(tab.id()))
                .with(Sort.by(Sort.Direction.ASC, "createdAt"));

        Map<String, String> names = new LinkedHashMap<>();
        names.put(tab.ownerSessionId().toHexString(), tab.customerName());
        for (Tab.Participant participant : tab.participantsOrEmpty()) {
            names.put(participant.sessionId().toHexString(), participant.name());
        }
        Map<String, Integer> totalsByPerson = new LinkedHashMap<>();

        int consumption = 0;
        List<BillResponse.BillOrder> orders = new ArrayList<>();
        for (Document order : mongo.find(query, Document.class, "order")) {
            Instant orderedAt = order.get("createdAt") instanceof Date date ? date.toInstant() : null;
            // [Mateus · Card 4] Alteração: o pedido cancelado é gravado como CANCELLED (dois L, ver init-mongo.js e
            // OrderOperationService); comparar só com "CANCELED" deixava o pedido cancelado somando na conta.
            boolean orderCanceled = TabTotals.IGNORED_STATUS.contains(order.getString("status"));
            List<BillResponse.BillLine> lines = new ArrayList<>();
            for (Object raw : order.getList("items", Object.class, List.of())) {
                if (!(raw instanceof Document item)) {
                    continue;
                }
                boolean canceled = orderCanceled || TabTotals.IGNORED_STATUS.contains(item.getString("status"));
                int quantity = item.get("quantity", Number.class).intValue();
                int total = item.get("unitPriceCents", Number.class).intValue() * quantity;
                String personId = personOf(item, tab);
                if (!canceled) {
                    consumption += total;
                    totalsByPerson.merge(personId, total, Integer::sum);
                }
                lines.add(new BillResponse.BillLine(item.getString("nameSnapshot"), item.getString("note"), quantity,
                        total, item.getString("status"), canceled, personId,
                        names.getOrDefault(personId, STAFF_NAME), orderedAt));
            }
            orders.add(new BillResponse.BillOrder(order.getObjectId("_id").toHexString(),
                    order.get("number", Number.class).intValue(), order.getString("status"), lines));
        }

        // [Mateus · Card 5] Alteração: no balcão não há taxa de serviço (o cliente paga só o pedido, antes do preparo).
        int serviceFee = "COUNTER".equals(tab.mode()) ? 0 : Math.round(consumption * SERVICE_FEE_PERCENT / 100f);
        // [Mateus · Card 5] Alteração: comanda de balcão não tem mesa; findById(null) dava erro.
        int tableNumber = tab.tableId() == null ? 0
                : tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        List<BillResponse.Person> people = new ArrayList<>();
        String ownerId = tab.ownerSessionId().toHexString();
        people.add(new BillResponse.Person(ownerId, tab.customerName(), true, totalsByPerson.getOrDefault(ownerId, 0)));
        for (Tab.Participant participant : tab.participantsOrEmpty()) {
            String id = participant.sessionId().toHexString();
            if (participant.active() || totalsByPerson.containsKey(id)) {
                people.add(new BillResponse.Person(id, participant.name(), false, totalsByPerson.getOrDefault(id, 0)));
            }
        }
        if (totalsByPerson.containsKey(STAFF_ID)) {
            people.add(new BillResponse.Person(STAFF_ID, STAFF_NAME, false, totalsByPerson.get(STAFF_ID)));
        }
        boolean owner = tab.ownerSessionId().equals(guest.userId());
        return new BillResponse(tab.id().toHexString(), tab.customerName(), tableNumber, tab.openedAt(), orders,
                consumption, serviceFee, consumption + serviceFee, owner, people);
    }

    private static String personOf(Document item, Tab tab) {
        if ("STAFF".equals(item.getString("placedByType"))) {
            return STAFF_ID;
        }
        return item.get("placedBySessionId") instanceof ObjectId sessionId
                ? sessionId.toHexString()
                : tab.ownerSessionId().toHexString();
    }
}
