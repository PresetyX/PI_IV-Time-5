/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/**
 * Conta da comanda: pedidos, consumo, taxa de serviço e quanto cada pessoa consumiu.
 *
 * @param consumptionCents soma dos itens não cancelados, sem a taxa de serviço
 * @param owner se quem está vendo a conta é o dono da comanda
 */
public record BillResponse(
        String tabId,
        String ownerName,
        int tableNumber,
        Instant openedAt,
        List<BillOrder> orders,
        int consumptionCents,
        int serviceFeeCents,
        int totalCents,
        boolean owner,
        List<Person> people) {

    /** Um pedido da comanda com seus itens. */
    public record BillOrder(String id, int number, String status, List<BillLine> items) {
    }

    /** Item cancelado continua na lista, para a tela mostrar riscado, mas não entra em nenhuma soma. */
    public record BillLine(String name, String note, int quantity, int totalCents, String status, boolean canceled,
            String personId, String orderedBy, Instant orderedAt) {
    }

    /** Quanto uma pessoa consumiu. Os itens lançados pelo garçom aparecem como uma pessoa à parte. */
    public record Person(String id, String name, boolean owner, int totalCents) {
    }
}
