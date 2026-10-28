package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

public record BillResponse(
        String tabId,
        String ownerName,
        int tableNumber,
        Instant openedAt,
        List<BillOrder> orders,
        int consumptionCents,
        int serviceFeeCents,
        int totalCents) {

    public record BillOrder(String id, int number, String status, List<BillLine> items) {
    }

    /** Item cancelado continua na lista, para a tela mostrar riscado, mas não entra em nenhuma soma. */
    public record BillLine(String name, String note, int quantity, int totalCents, String status, boolean canceled) {
    }
}
