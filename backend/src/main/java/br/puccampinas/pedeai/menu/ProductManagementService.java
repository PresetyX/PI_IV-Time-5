package br.puccampinas.pedeai.menu;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

@Service
public class ProductManagementService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final Clock clock;

    public ProductManagementService(ProductRepository productRepository, CategoryRepository categoryRepository,
            Clock clock) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.clock = clock;
    }

    public ManagementCatalog catalog(AuthenticatedUser user) {
        MenuAccess.requireRole(user, MenuAccess.VIEW_ROLES);
        Map<ObjectId, List<ManagementProduct>> productsByCategory = productRepository
                .findByStoreIdOrderByPositionAsc(user.storeId()).stream()
                .collect(Collectors.groupingBy(Product::categoryId,
                        Collectors.mapping(ManagementProduct::of, Collectors.toList())));

        List<ManagementCatalog.CategoryGroup> categories = categoryRepository
                .findByStoreIdOrderByPositionAsc(user.storeId()).stream()
                .map(category -> new ManagementCatalog.CategoryGroup(
                        category.id().toHexString(),
                        category.name(),
                        category.position(),
                        category.visible(),
                        productsByCategory.getOrDefault(category.id(), List.of())))
                .toList();
        return new ManagementCatalog(categories);
    }

    public ManagementProduct get(AuthenticatedUser user, String productId) {
        MenuAccess.requireRole(user, MenuAccess.VIEW_ROLES);
        return ManagementProduct.of(find(user, productId));
    }

    public ManagementProduct create(AuthenticatedUser user, ProductRequest request) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        Category category = categoryFor(user, request);
        boolean available = request.available() == null || request.available();
        Product created = new Product(
                new ObjectId(),
                user.storeId(),
                category.id(),
                request.name().trim(),
                MenuAccess.blankToNull(request.description()),
                request.priceCents(),
                MenuAccess.blankToNull(request.imageUrl()),
                request.prepMinutes(),
                available,
                available ? null : clock.instant(),
                Boolean.TRUE.equals(request.isAlcoholic()),
                nextPosition(user.storeId(), category.id()),
                request.optionGroups() == null ? List.of() : validOptionGroups(request.optionGroups()));
        return ManagementProduct.of(productRepository.save(created));
    }

    public ManagementProduct update(AuthenticatedUser user, String productId, ProductRequest request) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        Product current = find(user, productId);
        Category category = categoryFor(user, request);

        boolean movedCategory = !category.id().equals(current.categoryId());
        int position = movedCategory ? nextPosition(user.storeId(), category.id()) : current.position();
        boolean available = request.available() == null ? current.available() : request.available();
        List<OptionGroup> optionGroups = request.optionGroups() == null
                ? current.optionGroups()
                : validOptionGroups(request.optionGroups());

        Product updated = new Product(
                current.id(),
                current.storeId(),
                category.id(),
                request.name().trim(),
                MenuAccess.blankToNull(request.description()),
                request.priceCents(),
                MenuAccess.blankToNull(request.imageUrl()),
                request.prepMinutes(),
                available,
                unavailableSince(current, available),
                request.isAlcoholic() == null ? current.isAlcoholic() : request.isAlcoholic(),
                position,
                optionGroups);
        return ManagementProduct.of(productRepository.save(updated));
    }

    public ManagementProduct setAvailability(AuthenticatedUser user, String productId, boolean available) {
        MenuAccess.requireRole(user, MenuAccess.AVAILABILITY_ROLES);
        Product current = find(user, productId);
        if (current.available() == available) {
            return ManagementProduct.of(current);
        }
        Product updated = new Product(
                current.id(), current.storeId(), current.categoryId(), current.name(), current.description(),
                current.priceCents(), current.imageUrl(), current.prepMinutes(), available,
                unavailableSince(current, available), current.isAlcoholic(), current.position(),
                current.optionGroups());
        return ManagementProduct.of(productRepository.save(updated));
    }

    public List<ManagementProduct> reorder(AuthenticatedUser user, String categoryId, List<String> ids) {
        MenuAccess.requireRole(user, MenuAccess.EDIT_ROLES);
        Category category = categoryRepository.findByStoreIdAndId(user.storeId(), MenuAccess.parseId(categoryId))
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada."));
        List<Product> products = productRepository
                .findByStoreIdAndCategoryIdOrderByPositionAsc(user.storeId(), category.id());
        List<ObjectId> order = MenuAccess.sameIds(ids, products.stream().map(Product::id).toList(), "produtos");
        Map<ObjectId, Product> byId = products.stream().collect(Collectors.toMap(Product::id, p -> p));
        List<Product> result = new ArrayList<>();
        List<Product> changed = new ArrayList<>();
        for (int index = 0; index < order.size(); index++) {
            Product product = byId.get(order.get(index));
            Product placed = product.position() == index + 1 ? product : new Product(
                    product.id(), product.storeId(), product.categoryId(), product.name(), product.description(),
                    product.priceCents(), product.imageUrl(), product.prepMinutes(), product.available(),
                    product.unavailableSince(), product.isAlcoholic(), index + 1, product.optionGroups());
            if (placed != product) {
                changed.add(placed);
            }
            result.add(placed);
        }
        if (!changed.isEmpty()) {
            productRepository.saveAll(changed);
        }
        return result.stream().map(ManagementProduct::of).toList();
    }

    private Product find(AuthenticatedUser user, String productId) {
        return productRepository.findByStoreIdAndId(user.storeId(), MenuAccess.parseId(productId))
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado."));
    }

    private Category categoryFor(AuthenticatedUser user, ProductRequest request) {
        if (request.categoryId() == null || !ObjectId.isValid(request.categoryId())) {
            throw new InvalidRequestException("Categoria não encontrada.");
        }
        return categoryRepository.findByStoreIdAndId(user.storeId(), new ObjectId(request.categoryId()))
                .orElseThrow(() -> new InvalidRequestException("Categoria não encontrada."));
    }

    private Instant unavailableSince(Product current, boolean available) {
        if (available) {
            return null;
        }
        return current.available() || current.unavailableSince() == null
                ? clock.instant()
                : current.unavailableSince();
    }

    private int nextPosition(ObjectId storeId, ObjectId categoryId) {
        return productRepository.findByStoreIdAndCategoryIdOrderByPositionAsc(storeId, categoryId).stream()
                .mapToInt(Product::position)
                .max()
                .orElse(0) + 1;
    }

    private static List<OptionGroup> validOptionGroups(List<OptionGroup> groups) {
        for (OptionGroup group : groups) {
            if (group == null || group.name() == null || group.name().isBlank()) {
                throw new InvalidRequestException("Todo grupo de opções precisa de um nome.");
            }
            List<Option> options = group.options() == null ? List.of() : group.options();
            if (options.isEmpty()) {
                throw new InvalidRequestException("O grupo \"" + group.name() + "\" não tem opções.");
            }
            if (options.stream().anyMatch(option -> option == null || option.label() == null
                    || option.label().isBlank())) {
                throw new InvalidRequestException("Toda opção do grupo \"" + group.name() + "\" precisa de um nome.");
            }
            if (group.min() < 0 || group.max() < 1 || group.min() > group.max() || group.max() > options.size()) {
                throw new InvalidRequestException("Mínimo e máximo do grupo \"" + group.name() + "\" são inválidos.");
            }
            if (group.required() && group.min() < 1) {
                throw new InvalidRequestException("Grupo obrigatório \"" + group.name() + "\" precisa de mínimo 1.");
            }
        }
        return groups;
    }
}
