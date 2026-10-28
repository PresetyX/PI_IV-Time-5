package br.puccampinas.pedeai.tab;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
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
    private static final String CANCELED = "CANCELED";

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

        int consumption = 0;
        List<BillResponse.BillOrder> orders = new ArrayList<>();
        for (Document order : mongo.find(query, Document.class, "order")) {
            boolean orderCanceled = CANCELED.equals(order.getString("status"));
            List<BillResponse.BillLine> lines = new ArrayList<>();
            for (Object raw : order.getList("items", Object.class, List.of())) {
                if (!(raw instanceof Document item)) {
                    continue;
                }
                boolean canceled = orderCanceled || CANCELED.equals(item.getString("status"));
                int quantity = item.get("quantity", Number.class).intValue();
                int total = item.get("unitPriceCents", Number.class).intValue() * quantity;
                if (!canceled) {
                    consumption += total;
                }
                lines.add(new BillResponse.BillLine(item.getString("nameSnapshot"), item.getString("note"), quantity,
                        total, item.getString("status"), canceled));
            }
            orders.add(new BillResponse.BillOrder(order.getObjectId("_id").toHexString(),
                    order.get("number", Number.class).intValue(), order.getString("status"), lines));
        }

        int serviceFee = Math.round(consumption * SERVICE_FEE_PERCENT / 100f);
        int tableNumber = tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        return new BillResponse(tab.id().toHexString(), tab.customerName(), tableNumber, tab.openedAt(), orders,
                consumption, serviceFee, consumption + serviceFee);
    }
}
