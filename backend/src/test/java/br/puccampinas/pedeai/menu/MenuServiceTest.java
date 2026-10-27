package br.puccampinas.pedeai.menu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;

class MenuServiceTest {

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final CategoryRepository categoryRepository = mock(CategoryRepository.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private MenuService menuService;

    @BeforeEach
    void setUp() {
        menuService = new MenuService(storeRepository, categoryRepository, productRepository);
    }

    @Test
    void groupsAvailableProductsUnderVisibleCategories() {
        ObjectId storeId = new ObjectId();
        ObjectId drinksId = new ObjectId();
        ObjectId snacksId = new ObjectId();
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store(storeId, true)));
        when(categoryRepository.findByStoreIdAndVisibleTrueOrderByPositionAsc(storeId)).thenReturn(List.of(
                new Category(snacksId, storeId, "Lanches", 0, true),
                new Category(drinksId, storeId, "Bebidas", 1, true)));
        when(productRepository.findByStoreIdAndAvailableTrueOrderByPositionAsc(storeId)).thenReturn(List.of(
                product(storeId, drinksId, "Suco", 1200, 0),
                product(storeId, drinksId, "Refrigerante", 800, 1)));

        MenuResponse menu = menuService.getMenu("demo");

        assertEquals("demo", menu.store().slug());
        assertEquals(2, menu.categories().size());
        assertEquals(0, menu.categories().get(0).products().size());
        assertEquals(List.of("Suco", "Refrigerante"),
                menu.categories().get(1).products().stream().map(MenuResponse.ProductInfo::name).toList());
        assertEquals(1200, menu.categories().get(1).products().get(0).priceCents());
    }

    @Test
    void unknownStoreIsNotFound() {
        when(storeRepository.findBySlug("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> menuService.getMenu("missing"));
        verify(categoryRepository, never()).findByStoreIdAndVisibleTrueOrderByPositionAsc(any());
    }

    @Test
    void inactiveStoreIsNotFound() {
        ObjectId storeId = new ObjectId();
        when(storeRepository.findBySlug("off")).thenReturn(Optional.of(store(storeId, false)));

        assertThrows(ResourceNotFoundException.class, () -> menuService.getMenu("off"));
    }

    private static Store store(ObjectId id, boolean active) {
        return new Store(id, "demo", "Demo", null, null, null, null, null, "#D62F1F", null, null, null,
                1000, 500, null, null, null, false, active, null, null);
    }

    private static Product product(ObjectId storeId, ObjectId categoryId, String name, int priceCents, int position) {
        return new Product(new ObjectId(), storeId, categoryId, name, null, priceCents, null, null, true, null,
                null, position, List.of());
    }
}
