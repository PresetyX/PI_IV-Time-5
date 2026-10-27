package br.puccampinas.pedeai.menu;

import java.util.List;

public record MenuResponse(StoreInfo store, List<CategoryInfo> categories) {

    public record StoreInfo(String id, String slug, String name, String logoUrl, String primaryColor,
            String tagline) {
    }

    public record CategoryInfo(String id, String name, int position, List<ProductInfo> products) {
    }

    public record ProductInfo(String id, String name, String description, int priceCents, String imageUrl,
            Integer prepMinutes, Boolean isAlcoholic, List<OptionGroup> optionGroups) {
    }
}
