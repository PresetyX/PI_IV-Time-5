package br.puccampinas.pedeai.order;

import java.time.Instant;

public record OrderResponse(String id, int number, String status, int totalCents, Instant createdAt) {

    public static OrderResponse of(Order order) {
        return new OrderResponse(order.id().toHexString(), order.number(), order.status(), order.totalCents(),
                order.createdAt());
    }
}
