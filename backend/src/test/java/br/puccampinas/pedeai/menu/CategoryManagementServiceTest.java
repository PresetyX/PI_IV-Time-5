package br.puccampinas.pedeai.menu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

class CategoryManagementServiceTest {

    private final CategoryRepository categoryRepository = mock(CategoryRepository.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final ObjectId storeId = new ObjectId();
    private final Category lanches = new Category(new ObjectId(), storeId, "Lanches", 1, true);
    private final Category bebidas = new Category(new ObjectId(), storeId, "Bebidas", 2, true);
    private final Category doces = new Category(new ObjectId(), storeId, "Doces", 3, false);
    private final Product xSalada = new Product(new ObjectId(), storeId, lanches.id(), "X-salada", null, 2800, null,
            10, true, null, false, 1, List.of());
    private CategoryManagementService service;

    @BeforeEach
    void setUp() {
        service = new CategoryManagementService(categoryRepository, productRepository);
        when(categoryRepository.findByStoreIdOrderByPositionAsc(storeId))
                .thenReturn(new ArrayList<>(List.of(lanches, bebidas, doces)));
        when(categoryRepository.findByStoreIdAndId(eq(storeId), any())).thenAnswer(call -> {
            ObjectId id = call.getArgument(1);
            return List.of(lanches, bebidas, doces).stream().filter(c -> c.id().equals(id)).findFirst();
        });
        when(categoryRepository.save(any(Category.class))).thenAnswer(call -> call.getArgument(0));
        when(productRepository.findByStoreIdOrderByPositionAsc(storeId)).thenReturn(List.of(xSalada));
        when(productRepository.findByStoreIdAndCategoryIdOrderByPositionAsc(storeId, lanches.id()))
                .thenReturn(List.of(xSalada));
    }

    @Test
    void listCountsProductsOfEachCategory() {
        List<ManagementCategory> categories = service.list(user("KITCHEN"));

        assertEquals(List.of("Lanches", "Bebidas", "Doces"), categories.stream().map(ManagementCategory::name).toList());
        assertEquals(List.of(1, 0, 0), categories.stream().map(ManagementCategory::products).toList());
        assertFalse(categories.get(2).visible());
    }

    @Test
    void createGoesToTheEndAndIsVisibleByDefault() {
        ManagementCategory created = service.create(user("MANAGER"), new CategoryRequest("  Porções ", null));

        assertEquals("Porções", created.name());
        assertEquals(4, created.position());
        assertTrue(created.visible());
        assertEquals(0, created.products());
    }

    @Test
    void createRejectsRepeatedNameIgnoringCase() {
        assertThrows(ConflictException.class, () -> service.create(user("OWNER"), new CategoryRequest("bebidas", true)));
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void kitchenCannotChangeCategories() {
        assertThrows(ForbiddenException.class, () -> service.create(user("KITCHEN"), new CategoryRequest("Novas", true)));
        assertThrows(ForbiddenException.class, () -> service.remove(user("WAITER"), bebidas.id().toHexString()));
    }

    @Test
    void updateRenamesAndHidesKeepingPosition() {
        ManagementCategory saved = service.update(user("MANAGER"), lanches.id().toHexString(),
                new CategoryRequest("Sanduíches", false));

        assertEquals("Sanduíches", saved.name());
        assertFalse(saved.visible());
        assertEquals(1, saved.position());
        assertEquals(1, saved.products());
    }

    @Test
    void updateCanKeepItsOwnName() {
        ManagementCategory saved = service.update(user("MANAGER"), bebidas.id().toHexString(),
                new CategoryRequest("BEBIDAS", null));

        assertEquals("BEBIDAS", saved.name());
        assertTrue(saved.visible());
    }

    @Test
    void updateRejectsNameOfAnotherCategory() {
        assertThrows(ConflictException.class, () -> service.update(user("MANAGER"), bebidas.id().toHexString(),
                new CategoryRequest("Lanches", true)));
    }

    @Test
    void categoryFromAnotherStoreIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.update(user("OWNER"),
                new ObjectId().toHexString(), new CategoryRequest("Qualquer", true)));
    }

    @Test
    void removingCategoryWithProductsOnlyHidesIt() {
        CategoryRemoval removal = service.remove(user("OWNER"), lanches.id().toHexString());

        assertEquals(CategoryRemoval.HIDDEN, removal.outcome());
        assertFalse(removal.category().visible());
        assertEquals(1, removal.category().products());
        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void removingEmptyCategoryDeletesIt() {
        CategoryRemoval removal = service.remove(user("MANAGER"), bebidas.id().toHexString());

        assertEquals(CategoryRemoval.DELETED, removal.outcome());
        verify(categoryRepository).delete(bebidas);
    }

    @Test
    @SuppressWarnings("unchecked")
    void reorderSavesOnlyCategoriesThatMoved() {
        service.reorder(user("MANAGER"), List.of(
                bebidas.id().toHexString(), lanches.id().toHexString(), doces.id().toHexString()));

        ArgumentCaptor<Iterable<Category>> saved = ArgumentCaptor.forClass(Iterable.class);
        verify(categoryRepository).saveAll(saved.capture());
        List<Category> moved = new ArrayList<>();
        saved.getValue().forEach(moved::add);
        assertEquals(2, moved.size());
        assertTrue(moved.stream().anyMatch(c -> c.id().equals(bebidas.id()) && c.position() == 1));
        assertTrue(moved.stream().anyMatch(c -> c.id().equals(lanches.id()) && c.position() == 2));
    }

    @Test
    void reorderNeedsEveryCategoryExactlyOnce() {
        assertThrows(InvalidRequestException.class, () -> service.reorder(user("MANAGER"),
                List.of(bebidas.id().toHexString(), lanches.id().toHexString())));
        assertThrows(InvalidRequestException.class, () -> service.reorder(user("MANAGER"),
                List.of(bebidas.id().toHexString(), lanches.id().toHexString(), "x")));
        verify(categoryRepository, never()).saveAll(any());
    }

    private AuthenticatedUser user(String role) {
        return new AuthenticatedUser(new ObjectId(), storeId, role);
    }
}
