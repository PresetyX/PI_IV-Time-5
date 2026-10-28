package br.puccampinas.pedeai.order;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("orderEvent")
public record OrderEvent(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId orderId,
        String type,
        String from,
        String to,
        ObjectId byUserId,
        String note,
        Instant at) {

    public static final String CREATED = "CREATED";

    public static OrderEvent created(Order order, ObjectId byUserId) {
        return new OrderEvent(null, order.storeId(), order.id(), CREATED, null, order.status(), byUserId, null,
                order.createdAt());
    }
}
