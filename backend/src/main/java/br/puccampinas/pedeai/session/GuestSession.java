package br.puccampinas.pedeai.session;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("guestSession")
public record GuestSession(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId tableId,
        String mode,
        String name,
        String phone,
        Instant createdAt,
        Instant expiresAt) {
}
