package br.puccampinas.pedeai.store;

import java.util.List;

import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.common.ResourceNotFoundException;
import br.puccampinas.pedeai.menu.Category;
import br.puccampinas.pedeai.menu.CategoryRepository;
import br.puccampinas.pedeai.menu.Product;
import br.puccampinas.pedeai.menu.ProductRepository;

@Service
public class StoreService {

    private static final int MAX_HIGHLIGHTS = 3;

    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OpeningStatusCalculator openingStatusCalculator;

    public StoreService(StoreRepository storeRepository, CategoryRepository categoryRepository,
            ProductRepository productRepository, OpeningStatusCalculator openingStatusCalculator) {
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.openingStatusCalculator = openingStatusCalculator;
    }

    public Store getActiveStore(String slug) {
        return storeRepository.findBySlug(slug)
                .filter(Store::active)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found: " + slug));
    }

    public OpeningStatus getStatus(Store store) {
        return openingStatusCalculator.calculate(store);
    }

    public StoreResponse getStoreInfo(String slug) {
        Store store = getActiveStore(slug);
        List<String> highlights = categoryRepository.findByStoreIdAndVisibleTrueOrderByPositionAsc(store.id())
                .stream()
                .map(Category::name)
                .limit(MAX_HIGHLIGHTS)
                .toList();
        Integer averagePrepMinutes = medianPrepMinutes(
                productRepository.findByStoreIdAndAvailableTrueOrderByPositionAsc(store.id()));

        return new StoreResponse(
                store.id().toHexString(),
                store.slug(),
                store.name(),
                store.kind(),
                store.tagline(),
                store.logoUrl(),
                store.primaryColor(),
                store.address(),
                store.openingHours() == null ? List.of() : store.openingHours(),
                store.serviceModes() == null ? List.of() : store.serviceModes(),
                store.serviceFeeBasisPoints(),
                Boolean.TRUE.equals(store.requireCustomerPhone()),
                highlights,
                averagePrepMinutes,
                getStatus(store));
    }

    private static Integer medianPrepMinutes(List<Product> products) {
        List<Integer> minutes = products.stream()
                .map(Product::prepMinutes)
                .filter(value -> value != null && value > 0)
                .sorted()
                .toList();
        if (minutes.isEmpty()) {
            return null;
        }
        return minutes.get(minutes.size() / 2);
    }
}
