package br.puccampinas.pedeai.menu;

import java.time.Instant;
import java.util.List;

public record ManagementProduct(
        String id,
        String categoryId,
        String name,
        String description,
        int priceCents,
        String imageUrl,
        Integer prepMinutes,
        boolean available,
        Instant unavailableSince,
        Boolean isAlcoholic,
        int position,
        List<OptionGroup> optionGroups) {

    public static ManagementProduct of(Product product) {
        return new ManagementProduct(
                product.id().toHexString(),
                product.categoryId().toHexString(),
                product.name(),
                product.description(),
                product.priceCents(),
                product.imageUrl(),
                product.prepMinutes(),
                product.available(),
                product.unavailableSince(),
                Boolean.TRUE.equals(product.isAlcoholic()),
                product.position(),
                product.optionGroups() == null ? List.of() : product.optionGroups());
    }
}
