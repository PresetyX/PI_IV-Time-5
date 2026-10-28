package br.puccampinas.pedeai.table;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreService;

@RestController
public class TableController {

    private final StoreService storeService;
    private final TableService tableService;

    public TableController(StoreService storeService, TableService tableService) {
        this.storeService = storeService;
        this.tableService = tableService;
    }

    @GetMapping("/api/public/stores/{slug}/tables/{token}")
    public TableResponse byToken(@PathVariable String slug, @PathVariable String token) {
        Store store = storeService.getActiveStore(slug);
        return TableResponse.of(tableService.getActiveByToken(store.id(), token));
    }

    @GetMapping("/api/public/stores/{slug}/tables")
    public TableResponse byNumber(@PathVariable String slug, @RequestParam int number) {
        Store store = storeService.getActiveStore(slug);
        return TableResponse.of(tableService.getActiveByNumber(store.id(), number));
    }
}
