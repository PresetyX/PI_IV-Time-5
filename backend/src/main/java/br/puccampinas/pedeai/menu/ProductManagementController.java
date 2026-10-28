package br.puccampinas.pedeai.menu;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/management/products")
public class ProductManagementController {

    private final ProductManagementService service;

    public ProductManagementController(ProductManagementService service) {
        this.service = service;
    }

    @GetMapping
    public ManagementCatalog catalog(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.catalog(user);
    }

    @GetMapping("/{productId}")
    public ManagementProduct get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String productId) {
        return service.get(user, productId);
    }

    @PutMapping("/{productId}")
    public ManagementProduct update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String productId,
            @Valid @RequestBody UpdateProductRequest request) {
        return service.update(user, productId, request);
    }

    @PatchMapping("/{productId}/availability")
    public ManagementProduct setAvailability(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String productId, @Valid @RequestBody AvailabilityRequest request) {
        return service.setAvailability(user, productId, request.available());
    }
}
