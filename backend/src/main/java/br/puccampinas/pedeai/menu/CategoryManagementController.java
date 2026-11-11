package br.puccampinas.pedeai.menu;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/management/categories")
public class CategoryManagementController {

    private final CategoryManagementService categoryService;
    private final ProductManagementService productService;

    public CategoryManagementController(CategoryManagementService categoryService,
            ProductManagementService productService) {
        this.categoryService = categoryService;
        this.productService = productService;
    }

    @GetMapping
    public List<ManagementCategory> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return categoryService.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ManagementCategory create(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CategoryRequest request) {
        return categoryService.create(user, request);
    }

    @PutMapping("/order")
    public List<ManagementCategory> reorder(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody ReorderRequest request) {
        return categoryService.reorder(user, request.ids());
    }

    @PutMapping("/{categoryId}")
    public ManagementCategory update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String categoryId,
            @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(user, categoryId, request);
    }

    @DeleteMapping("/{categoryId}")
    public CategoryRemoval remove(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String categoryId) {
        return categoryService.remove(user, categoryId);
    }

    @PutMapping("/{categoryId}/products/order")
    public List<ManagementProduct> reorderProducts(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String categoryId, @Valid @RequestBody ReorderRequest request) {
        return productService.reorder(user, categoryId, request.ids());
    }
}
