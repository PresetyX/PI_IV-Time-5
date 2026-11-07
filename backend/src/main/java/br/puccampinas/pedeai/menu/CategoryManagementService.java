package br.puccampinas.pedeai.menu;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

@Service
public class CategoryManagementService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryManagementService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public List<ManagementCategory> list(AuthenticatedUser user) {
        MenuAccess.requireRole(user, MenuAccess.VIEW_ROLES);
        Map<ObjectId, Long> counts = productRepository.findByStoreIdOrderByPositionAsc(user.storeId()).stream()
                .collect(Collectors.groupingBy(Product::categoryId, Collectors.counting()));
        return categoryRepository.findByStoreIdOrderByPositionAsc(user.storeId()).stream()
                .map(category -> ManagementCategory.of(category, counts.getOrDefault(category.id(), 0L).intValue()))
                .toList();
    }

    public ManagementCategory create(AuthenticatedUser user, CategoryRequest request) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        List<Category> categories = categoryRepository.findByStoreIdOrderByPositionAsc(user.storeId());
        String name = request.name().trim();
        requireUniqueName(categories, name, null);
        int position = categories.stream().mapToInt(Category::position).max().orElse(0) + 1;
        Category created = categoryRepository.save(new Category(new ObjectId(), user.storeId(), name, position,
                request.visible() == null || request.visible()));
        return ManagementCategory.of(created, 0);
    }

    public ManagementCategory update(AuthenticatedUser user, String categoryId, CategoryRequest request) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        Category current = find(user, categoryId);
        String name = request.name().trim();
        requireUniqueName(categoryRepository.findByStoreIdOrderByPositionAsc(user.storeId()), name, current.id());
        boolean visible = request.visible() == null ? current.visible() : request.visible();
        Category saved = categoryRepository.save(
                new Category(current.id(), current.storeId(), name, current.position(), visible));
        return ManagementCategory.of(saved, productsIn(user, current.id()));
    }

    public CategoryRemoval remove(AuthenticatedUser user, String categoryId) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        Category current = find(user, categoryId);
        int products = productsIn(user, current.id());
        if (products == 0) {
            categoryRepository.delete(current);
            return new CategoryRemoval(CategoryRemoval.DELETED, ManagementCategory.of(current, 0));
        }
        Category hidden = current.visible()
                ? categoryRepository.save(new Category(current.id(), current.storeId(), current.name(),
                        current.position(), false))
                : current;
        return new CategoryRemoval(CategoryRemoval.HIDDEN, ManagementCategory.of(hidden, products));
    }

    public List<ManagementCategory> reorder(AuthenticatedUser user, List<String> ids) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        List<Category> categories = categoryRepository.findByStoreIdOrderByPositionAsc(user.storeId());
        List<ObjectId> order = MenuAccess.sameIds(ids, categories.stream().map(Category::id).toList(), "categorias");
        Map<ObjectId, Category> byId = categories.stream().collect(Collectors.toMap(Category::id, c -> c));
        List<Category> changed = new ArrayList<>();
        for (int index = 0; index < order.size(); index++) {
            Category category = byId.get(order.get(index));
            if (category.position() != index + 1) {
                changed.add(new Category(category.id(), category.storeId(), category.name(), index + 1,
                        category.visible()));
            }
        }
        if (!changed.isEmpty()) {
            categoryRepository.saveAll(changed);
        }
        return list(user);
    }

    private Category find(AuthenticatedUser user, String categoryId) {
        return categoryRepository.findByStoreIdAndId(user.storeId(), MenuAccess.parseId(categoryId))
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada."));
    }

    private int productsIn(AuthenticatedUser user, ObjectId categoryId) {
        return productRepository.findByStoreIdAndCategoryIdOrderByPositionAsc(user.storeId(), categoryId).size();
    }

    private static void requireUniqueName(List<Category> categories, String name, ObjectId ignore) {
        String wanted = name.toLowerCase(Locale.ROOT);
        boolean taken = categories.stream()
                .filter(category -> !category.id().equals(ignore))
                .anyMatch(category -> category.name().trim().toLowerCase(Locale.ROOT).equals(wanted));
        if (taken) {
            throw new ConflictException("Já existe uma categoria com esse nome.");
        }
    }
}
