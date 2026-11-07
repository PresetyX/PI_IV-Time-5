package br.puccampinas.pedeai.menu;

public record ManagementCategory(String id, String name, int position, boolean visible, int products) {

    public static ManagementCategory of(Category category, int products) {
        return new ManagementCategory(category.id().toHexString(), category.name(), category.position(),
                category.visible(), products);
    }
}
