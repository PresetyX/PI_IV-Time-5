package br.puccampinas.pedeai.menu;

import java.util.List;

public record ManagementCatalog(List<CategoryGroup> categories) {

    public record CategoryGroup(
            String id,
            String name,
            int position,
            boolean visible,
            List<ManagementProduct> products) {
    }
}
