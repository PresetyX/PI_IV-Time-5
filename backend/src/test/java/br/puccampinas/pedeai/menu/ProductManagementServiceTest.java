package br.puccampinas.pedeai.menu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

class ProductManagementServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T23:00:00Z");

    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final CategoryRepository categoryRepository = mock(CategoryRepository.class);
    private final ObjectId storeId = new ObjectId();
    private final Category porcoes = new Category(new ObjectId(), storeId, "Porções", 1, true);
    private final Category bebidas = new Category(new ObjectId(), storeId, "Bebidas", 2, false);
    private final Product fritas = product(porcoes, "Porção de fritas", 3200, 1, true, null);
    private final Product calabresa = product(porcoes, "Calabresa acebolada", 3800, 2, false,
            Instant.parse("2026-10-27T20:00:00Z"));
    private ProductManagementService service;

    @BeforeEach
    void setUp() {
        service = new ProductManagementService(productRepository, categoryRepository, Clock.fixed(NOW, ZoneOffset.UTC));
        when(productRepository.findByStoreIdAndId(eq(storeId), any())).thenAnswer(call -> {
            ObjectId id = call.getArgument(1);
            return List.of(fritas, calabresa).stream().filter(p -> p.id().equals(id)).findFirst();
        });
        when(categoryRepository.findByStoreIdAndId(eq(storeId), any())).thenAnswer(call -> {
            ObjectId id = call.getArgument(1);
            return List.of(porcoes, bebidas).stream().filter(c -> c.id().equals(id)).findFirst();
        });
        when(productRepository.save(any(Product.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void catalogListsEveryCategoryAndProductIncludingHiddenAndUnavailable() {
        when(categoryRepository.findByStoreIdOrderByPositionAsc(storeId)).thenReturn(List.of(porcoes, bebidas));
        when(productRepository.findByStoreIdOrderByPositionAsc(storeId)).thenReturn(List.of(fritas, calabresa));

        ManagementCatalog catalog = service.catalog(user("MANAGER"));

        assertEquals(2, catalog.categories().size());
        assertEquals(List.of("Porção de fritas", "Calabresa acebolada"),
                catalog.categories().get(0).products().stream().map(ManagementProduct::name).toList());
        assertFalse(catalog.categories().get(0).products().get(1).available());
        assertFalse(catalog.categories().get(1).visible());
        assertTrue(catalog.categories().get(1).products().isEmpty());
    }

    @Test
    void kitchenCanSeeTheCatalogButWaiterCannot() {
        when(categoryRepository.findByStoreIdOrderByPositionAsc(storeId)).thenReturn(List.of());
        when(productRepository.findByStoreIdOrderByPositionAsc(storeId)).thenReturn(List.of());

        service.catalog(user("KITCHEN"));
        assertThrows(ForbiddenException.class, () -> service.catalog(user("WAITER")));
    }

    @Test
    void productFromAnotherStoreIsNotFound() {
        AuthenticatedUser otherStore = new AuthenticatedUser(new ObjectId(), new ObjectId(), "OWNER");
        when(productRepository.findByStoreIdAndId(eq(otherStore.storeId()), any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.get(otherStore, fritas.id().toHexString()));
    }

    @Test
    void invalidIdIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.get(user("OWNER"), "abc"));
    }

    @Test
    void updateSavesPriceInCentsAndKeepsPositionInTheSameCategory() {
        ManagementProduct saved = service.update(user("MANAGER"), fritas.id().toHexString(),
                request(porcoes, "  Fritas grandes ", 3550, null));

        assertEquals("Fritas grandes", saved.name());
        assertEquals(3550, saved.priceCents());
        assertEquals(1, saved.position());
        assertTrue(saved.available());
        assertEquals(fritas.optionGroups(), saved.optionGroups());
    }

    @Test
    void movingToAnotherCategoryPutsTheProductAtTheEnd() {
        when(productRepository.findByStoreIdAndCategoryIdOrderByPositionAsc(storeId, bebidas.id()))
                .thenReturn(List.of(product(bebidas, "Chopp", 1400, 4, true, null)));

        ManagementProduct saved = service.update(user("OWNER"), fritas.id().toHexString(),
                request(bebidas, "Fritas", 3200, null));

        assertEquals(bebidas.id().toHexString(), saved.categoryId());
        assertEquals(5, saved.position());
    }

    @Test
    void updateRejectsCategoryFromAnotherStore() {
        Category alheia = new Category(new ObjectId(), new ObjectId(), "Outra loja", 1, true);

        assertThrows(InvalidRequestException.class, () -> service.update(user("OWNER"),
                fritas.id().toHexString(), request(alheia, "Fritas", 3200, null)));
        verify(productRepository, never()).save(any());
    }

    @Test
    void kitchenCannotEditProduct() {
        assertThrows(ForbiddenException.class, () -> service.update(user("KITCHEN"),
                fritas.id().toHexString(), request(porcoes, "Fritas", 1, null)));
    }

    @Test
    void updateRejectsOptionGroupWithMinGreaterThanMax() {
        List<OptionGroup> groups = List.of(new OptionGroup("Ponto", true, 2, 1,
                List.of(new Option("Mal passado", 0), new Option("Ao ponto", 0))));

        assertThrows(InvalidRequestException.class, () -> service.update(user("OWNER"),
                fritas.id().toHexString(), request(porcoes, "Fritas", 3200, groups)));
    }

    @Test
    void turningOffAvailabilityRecordsWhenItRanOut() {
        ManagementProduct saved = service.setAvailability(user("KITCHEN"), fritas.id().toHexString(), false);

        assertFalse(saved.available());
        assertEquals(NOW, saved.unavailableSince());
    }

    @Test
    void turningAvailabilityBackOnClearsTheDate() {
        ManagementProduct saved = service.setAvailability(user("MANAGER"), calabresa.id().toHexString(), true);

        assertTrue(saved.available());
        assertNull(saved.unavailableSince());
    }

    @Test
    void sameAvailabilityDoesNotWriteAgain() {
        ManagementProduct saved = service.setAvailability(user("MANAGER"), calabresa.id().toHexString(), false);

        assertSame(calabresa.unavailableSince(), saved.unavailableSince());
        verify(productRepository, never()).save(any());
    }

    @Test
    void waiterCannotChangeAvailability() {
        assertThrows(ForbiddenException.class,
                () -> service.setAvailability(user("WAITER"), fritas.id().toHexString(), false));
    }

    private AuthenticatedUser user(String role) {
        return new AuthenticatedUser(new ObjectId(), storeId, role);
    }

    private Product product(Category category, String name, int priceCents, int position, boolean available,
            Instant unavailableSince) {
        return new Product(new ObjectId(), storeId, category.id(), name, null, priceCents, null, 10, available,
                unavailableSince, false, position, List.of());
    }

    private static UpdateProductRequest request(Category category, String name, int priceCents,
            List<OptionGroup> optionGroups) {
        return new UpdateProductRequest(category.id().toHexString(), name, "", priceCents, null, 12, false, null,
                optionGroups);
    }
}
