package br.puccampinas.pedeai.menu;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;

@Service
public class MenuService {

    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public MenuService(StoreRepository storeRepository, CategoryRepository categoryRepository,
            ProductRepository productRepository) {
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public MenuResponse getMenu(String slug) {
        Store store = storeRepository.findBySlug(slug)
                .filter(Store::active)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found: " + slug));

        Map<ObjectId, List<Product>> productsByCategory = productRepository
                .findByStoreIdAndAvailableTrueOrderByPositionAsc(store.id()).stream()
                .collect(Collectors.groupingBy(Product::categoryId));

        List<MenuResponse.CategoryInfo> categories = categoryRepository
                .findByStoreIdAndVisibleTrueOrderByPositionAsc(store.id()).stream()
                .map(category -> new MenuResponse.CategoryInfo(
                        category.id().toHexString(),
                        category.name(),
                        category.position(),
                        productsByCategory.getOrDefault(category.id(), List.of()).stream()
                                .map(MenuService::toProductInfo)
                                .toList()))
                .toList();

        MenuResponse.StoreInfo storeInfo = new MenuResponse.StoreInfo(
                store.id().toHexString(), store.slug(), store.name(), store.logoUrl(), store.primaryColor(),
                store.tagline());
        return new MenuResponse(storeInfo, categories);
    }

    private static MenuResponse.ProductInfo toProductInfo(Product product) {
        return new MenuResponse.ProductInfo(
                product.id().toHexString(), product.name(), product.description(), product.priceCents(),
                product.imageUrl(), product.prepMinutes(), product.isAlcoholic(), product.optionGroups());
    }
}
