package br.puccampinas.pedeai.order;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.store.OpeningStatusCalculator;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreService;

/**
 * [Mateus · Card 5] Painel de senhas do balcão para TV. Público: devolve só números de senha de hoje (nada de nome
 * ou valor), separados em "em preparo" (já pagos) e "prontos". Senha com algum pedido pronto aparece só em prontos.
 */
@RestController
public class PickupBoardController {

    private final StoreService storeService;
    private final MongoTemplate mongo;
    private final Clock clock;

    public PickupBoardController(StoreService storeService, MongoTemplate mongo, Clock clock) {
        this.storeService = storeService;
        this.mongo = mongo;
        this.clock = clock;
    }

    public record PickupBoard(String storeName, List<Integer> preparing, List<Integer> ready) {
    }

    @GetMapping("/api/public/stores/{slug}/pickup-board")
    public PickupBoard board(@PathVariable String slug) {
        Store store = storeService.getActiveStore(slug);
        LocalDate today = LocalDate.now(clock.withZone(OpeningStatusCalculator.STORE_ZONE));
        Date startOfDay = Date.from(today.atStartOfDay(OpeningStatusCalculator.STORE_ZONE).toInstant());

        Query query = Query.query(Criteria.where("storeId").is(store.id()).and("pickupTicket").exists(true)
                .and("createdAt").gte(startOfDay).and("status").in("RECEIVED", "PREPARING", "READY"));
        query.fields().include("pickupTicket", "status");

        Set<Integer> preparing = new TreeSet<>();
        Set<Integer> ready = new TreeSet<>();
        for (Document order : mongo.find(query, Document.class, "order")) {
            if (!(order.get("pickupTicket") instanceof Number number)) {
                continue;
            }
            if ("READY".equals(order.getString("status"))) {
                ready.add(number.intValue());
            } else {
                preparing.add(number.intValue());
            }
        }
        preparing.removeAll(ready);
        return new PickupBoard(store.name(), List.copyOf(preparing), List.copyOf(ready));
    }
}
