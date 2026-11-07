package br.puccampinas.pedeai.payment;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.tab.Tab;
import br.puccampinas.pedeai.tab.TabService;
import br.puccampinas.pedeai.tab.TabTotals;

@Service
public class PixService {

    private final TabService tabService;
    private final TabTotals tabTotals;
    private final MongoTemplate mongo;

    public PixService(TabService tabService, TabTotals tabTotals, MongoTemplate mongo) {
        this.tabService = tabService;
        this.tabTotals = tabTotals;
        this.mongo = mongo;
    }

    public PixResponse pixOfMyTab(AuthenticatedUser guest) {
        Tab tab = tabService.requireMyTab(guest);
        if (!tab.ownerSessionId().equals(guest.userId())) {
            throw new ForbiddenException("Only who opened the tab can pay it");
        }
        Document store = mongo.findById(tab.storeId(), Document.class, "store");
        String pixKey = store == null ? null : store.getString("pixKey");
        if (pixKey == null || pixKey.isBlank()) {
            throw new ConflictException("This store does not take Pix through the app");
        }
        String storeName = store.getString("name");
        int amount = tabTotals.recalculate(tab.storeId(), tab.id()).totalCents();
        if (amount <= 0) {
            return new PixResponse(tab.id().toHexString(), storeName, 0, null);
        }
        Document address = store.get("address", Document.class);
        String city = address == null ? null : address.getString("city");
        String payload = PixPayload.build(pixKey, storeName, city, amount, tab.id().toHexString());
        return new PixResponse(tab.id().toHexString(), storeName, amount, payload);
    }
}
