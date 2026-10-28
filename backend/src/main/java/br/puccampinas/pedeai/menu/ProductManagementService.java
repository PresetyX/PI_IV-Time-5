package br.puccampinas.pedeai.menu;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

@Service
public class ProductManagementService {

    static final Set<String> VIEW_ROLES = Set.of("OWNER", "MANAGER", "KITCHEN");
    static final Set<String> EDIT_ROLES = Set.of("OWNER", "MANAGER");
    static final Set<String> AVAILABILITY_ROLES = Set.of("OWNER", "MANAGER", "KITCHEN");

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
        requireRole(user, VIEW_ROLES);
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
        requireRole(user, VIEW_ROLES);
        return ManagementProduct.of(find(user, productId));
    }

    public ManagementProduct update(AuthenticatedUser user, String productId, UpdateProductRequest request) {
        requireRole(user, EDIT_ROLES);
        Product current = find(user, productId);
        Category category = categoryRepository.findByStoreIdAndId(user.storeId(), parseId(request.categoryId()))
                .orElseThrow(() -> new InvalidRequestException("Categoria não encontrada."));

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
                blankToNull(request.description()),
                request.priceCents(),
                blankToNull(request.imageUrl()),
                request.prepMinutes(),
                available,
                unavailableSince(current, available),
                request.isAlcoholic() == null ? current.isAlcoholic() : request.isAlcoholic(),
                position,
                optionGroups);
        return ManagementProduct.of(productRepository.save(updated));
    }

    public ManagementProduct setAvailability(AuthenticatedUser user, String productId, boolean available) {
        requireRole(user, AVAILABILITY_ROLES);
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

    private Product find(AuthenticatedUser user, String productId) {
        return productRepository.findByStoreIdAndId(user.storeId(), parseId(productId))
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado."));
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

    private static void requireRole(AuthenticatedUser user, Set<String> roles) {
        if (user == null || !roles.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    private static ObjectId parseId(String value) {
        if (value == null || !ObjectId.isValid(value)) {
            throw new ResourceNotFoundException("Identificador inválido.");
        }
        return new ObjectId(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
