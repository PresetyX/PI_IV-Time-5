package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/** Um pedido da comanda visto pelo cliente, com a linha do tempo dos status. */
public record OrderTrackingResponse(
        String id,
        int number,
        String status,
        int tableNumber,
        Instant createdAt,
        List<Line> items,
        int totalCents,
        List<Step> timeline) {

    /** {@code options} traz os nomes das opções escolhidas ("Ao ponto", "Bacon extra"). */
    public record Line(String name, String note, int quantity, int totalCents, boolean canceled,
            List<String> options, String status, Instant deliveredAt) {
    }

    /** Do mais antigo para o mais novo; o primeiro é sempre a chegada na cozinha. */
    public record Step(String status, Instant at) {
    }
}
