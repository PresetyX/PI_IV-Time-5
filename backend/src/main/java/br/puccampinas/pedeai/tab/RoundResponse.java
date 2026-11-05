package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/** Última rodada da comanda, para repetir, e o que o resto da mesa anda pedindo. */
public record RoundResponse(
        String ownerName,
        int tableNumber,
        Integer lastOrderNumber,
        Instant lastOrderAt,
        List<RoundItem> items,
        List<Suggestion> suggestions) {

    /** Preço e disponibilidade são os de agora, porque é por eles que o pedido repetido vai ser cobrado. */
    public record RoundItem(String productId, String name, String note, int quantity, int unitPriceCents,
            boolean available) {
    }

    public record Suggestion(String productId, String name, int priceCents, String orderedBy, Instant orderedAt) {
    }
}
