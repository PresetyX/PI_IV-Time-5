package br.puccampinas.pedeai.tab;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.table.TableRepository;

@Service
public class OrderTrackingService {

    private final TabService tabService;
    private final TableRepository tableRepository;
    private final MongoTemplate mongo;

    public OrderTrackingService(TabService tabService, TableRepository tableRepository, MongoTemplate mongo) {
        this.tabService = tabService;
        this.tableRepository = tableRepository;
        this.mongo = mongo;
    }

    /** Só acha pedido da comanda do próprio convidado; pedido de outra comanda responde como inexistente. */
    public OrderTrackingResponse track(AuthenticatedUser guest, String orderId) {
        Tab tab = tabService.requireMyTab(guest);
        Document order = ObjectId.isValid(orderId)
                ? mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(orderId))
                        .and("storeId").is(tab.storeId()).and("tabId").is(tab.id())), Document.class, "order")
                : null;
        if (order == null) {
            throw new ResourceNotFoundException("Order not found");
        }

        boolean orderCanceled = TabTotals.IGNORED_STATUS.contains(order.getString("status"));
        int total = 0;
        List<OrderTrackingResponse.Line> lines = new ArrayList<>();
        for (Document item : order.getList("items", Document.class, List.of())) {
            boolean canceled = orderCanceled || TabTotals.IGNORED_STATUS.contains(item.getString("status"));
            int quantity = TabTotals.number(item, "quantity");
            int lineTotal = TabTotals.number(item, "unitPriceCents") * quantity;
            if (!canceled) {
                total += lineTotal;
            }
            lines.add(new OrderTrackingResponse.Line(item.getString("nameSnapshot"), item.getString("note"), quantity,
                    lineTotal, canceled));
        }

        List<OrderTrackingResponse.Step> timeline = new ArrayList<>();
        timeline.add(new OrderTrackingResponse.Step("RECEIVED", order.getDate("createdAt").toInstant()));
        for (Document event : order.getList("statusHistory", Document.class, List.of())) {
            if (event.get("at") instanceof Date at) {
                timeline.add(new OrderTrackingResponse.Step(event.getString("to"), at.toInstant()));
            }
        }

        int tableNumber = tableRepository.findById(tab.tableId()).map(table -> table.number()).orElse(0);
        return new OrderTrackingResponse(order.getObjectId("_id").toHexString(), TabTotals.number(order, "number"),
                order.getString("status"), tableNumber, order.getDate("createdAt").toInstant(), lines, total,
                timeline);
    }
}
