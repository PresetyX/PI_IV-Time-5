package br.puccampinas.pedeai.menu;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/api/public/stores/{slug}/menu")
    public MenuResponse menu(@PathVariable String slug) {
        return menuService.getMenu(slug);
    }
}
