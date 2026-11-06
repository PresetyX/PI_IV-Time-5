package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/**
 * [Mateus · Card 5] Senha do balcão vista pelo cliente. {@code pickupTicket} é nulo até o primeiro pedido;
 * {@code tabStatus} CLOSED quer dizer retirada confirmada.
 */
public record PickupResponse(
        String tabId,
        Integer pickupTicket,
        String tabStatus,
        String customerName,
        int totalCents,
        int paidCents,
        List<Order> orders) {

    public record Order(String id, int number, String status, int totalCents, Instant createdAt, List<Line> items) {
    }

    public record Line(String name, int quantity, List<String> options, String status) {
    }
}
