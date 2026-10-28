package br.puccampinas.pedeai.order;

import java.time.Instant;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("order")
public record Order(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId tabId,
        ObjectId tableId,
        int number,
        String status,
        boolean ageConfirmed,
        List<OrderItem> items,
        int totalCents,
        Instant createdAt) {

    public static final String STATUS_RECEIVED = "RECEIVED";

    public record OrderItem(
            ObjectId productId,
            String nameSnapshot,
            int unitPriceCents,
            int quantity,
            String note,
            List<OrderOption> options,
            String status,
            String placedByType,
            ObjectId placedByUserId,
            ObjectId placedBySessionId) {
    }

    public record OrderOption(String group, String label, int deltaCents) {
    }
}
