package br.puccampinas.pedeai.store;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping("/api/public/stores/{slug}")
    public StoreResponse store(@PathVariable String slug) {
        return storeService.getStoreInfo(slug);
    }
}
