package br.puccampinas.pedeai.server.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;

import br.puccampinas.pedeai.server.protocol.CommandException;
import br.puccampinas.pedeai.server.repository.CategoryRepository;
import br.puccampinas.pedeai.server.repository.ProductRepository;
import br.puccampinas.pedeai.server.repository.TenantRepository;

public class MenuService {

    private final TenantRepository tenantRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public MenuService(TenantRepository tenantRepository, CategoryRepository categoryRepository,
            ProductRepository productRepository) {
        this.tenantRepository = tenantRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public Map<String, Object> list(String tenantSlug) {
        Document tenant = tenantRepository.findBySlug(tenantSlug);
        if (tenant == null) {
            throw new CommandException("NOT_FOUND", "Tenant not found: " + tenantSlug);
        }
        ObjectId tenantId = tenant.getObjectId("_id");

        Map<ObjectId, List<Object>> productsByCategory = new LinkedHashMap<>();
        for (Document product : productRepository.findAvailable(tenantId)) {
            productsByCategory
                    .computeIfAbsent(product.getObjectId("categoryId"), key -> new ArrayList<>())
                    .add(toProductMap(product));
        }

        List<Object> categories = new ArrayList<>();
        for (Document category : categoryRepository.findActive(tenantId)) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", category.getObjectId("_id").toHexString());
            entry.put("name", category.getString("name"));
            entry.put("products", productsByCategory.getOrDefault(category.getObjectId("_id"), List.of()));
            categories.add(entry);
        }

        Map<String, Object> tenantInfo = new LinkedHashMap<>();
        tenantInfo.put("id", tenantId.toHexString());
        tenantInfo.put("slug", tenant.getString("slug"));
        tenantInfo.put("name", tenant.getString("name"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tenant", tenantInfo);
        result.put("categories", categories);
        return result;
    }

    private Map<String, Object> toProductMap(Document product) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", product.getObjectId("_id").toHexString());
        entry.put("name", product.getString("name"));
        entry.put("description", product.getString("description"));
        entry.put("priceCents", product.get("priceCents"));
        return entry;
    }
}
