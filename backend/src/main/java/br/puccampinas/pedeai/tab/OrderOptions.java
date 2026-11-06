package br.puccampinas.pedeai.tab;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.bson.Document;

import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.menu.Option;
import br.puccampinas.pedeai.menu.OptionGroup;
import br.puccampinas.pedeai.menu.Product;

/**
 * Confere as opções escolhidas para um produto contra os grupos cadastrados: grupo e opção precisam existir, sem
 * repetir, e cada grupo respeita mínimo e máximo (grupo obrigatório pede pelo menos uma). O preço de cada opção
 * vem sempre do cadastro.
 */
final class OrderOptions {

    private OrderOptions() {
    }

    /** Opções conferidas: o que vai gravado no item e a soma dos acréscimos de uma unidade. */
    record Resolved(List<Document> documents, List<Integer> deltasCents, int deltaSumCents) {
    }

    static Resolved resolve(Product product, List<PlaceOrderRequest.SelectedOption> selected) {
        List<OptionGroup> groups = product.optionGroups() == null ? List.of() : product.optionGroups();
        Map<String, OptionGroup> byName = new HashMap<>();
        groups.forEach(group -> byName.put(group.name(), group));

        Map<String, Integer> countByGroup = new HashMap<>();
        Set<String> seen = new HashSet<>();
        List<Document> documents = new ArrayList<>();
        List<Integer> deltas = new ArrayList<>();
        int sum = 0;
        for (PlaceOrderRequest.SelectedOption choice : selected) {
            OptionGroup group = byName.get(choice.group());
            if (group == null) {
                throw invalid(product, "não tem o grupo de opções " + choice.group());
            }
            Option option = optionsOf(group).stream().filter(o -> o.label().equals(choice.label())).findFirst()
                    .orElseThrow(() -> invalid(product, "não tem a opção " + choice.label() + " em " + group.name()));
            if (!seen.add(group.name() + "\u0000" + option.label())) {
                throw invalid(product, "repetiu a opção " + option.label());
            }
            countByGroup.merge(group.name(), 1, Integer::sum);
            documents.add(new Document("group", group.name()).append("label", option.label())
                    .append("deltaCents", option.deltaCents()));
            deltas.add(option.deltaCents());
            sum += option.deltaCents();
        }

        for (OptionGroup group : groups) {
            int count = countByGroup.getOrDefault(group.name(), 0);
            int min = group.required() ? Math.max(1, group.min()) : Math.max(0, group.min());
            if (count < min) {
                throw invalid(product, "precisa de pelo menos " + min + " opção em " + group.name());
            }
            if (group.max() > 0 && count > group.max()) {
                throw invalid(product, "aceita no máximo " + group.max() + " opções em " + group.name());
            }
        }
        return new Resolved(documents, deltas, sum);
    }

    /** Mesma conferência, sem exceção: vazio se as opções não valem mais para o produto (cadastro mudou). */
    static Optional<Resolved> tryResolve(Product product, List<PlaceOrderRequest.SelectedOption> selected) {
        try {
            return Optional.of(resolve(product, selected));
        } catch (InvalidRequestException e) {
            return Optional.empty();
        }
    }

    /** Opções gravadas num item de pedido, no formato do request, para repetir. */
    static List<PlaceOrderRequest.SelectedOption> fromItem(Document item) {
        return item.getList("options", Document.class, List.of()).stream()
                .filter(option -> option.getString("group") != null && option.getString("label") != null)
                .map(option -> new PlaceOrderRequest.SelectedOption(option.getString("group"), option.getString("label")))
                .toList();
    }

    private static List<Option> optionsOf(OptionGroup group) {
        return group.options() == null ? List.of() : group.options();
    }

    private static InvalidRequestException invalid(Product product, String detail) {
        return new InvalidRequestException(product.name() + " " + detail);
    }
}
