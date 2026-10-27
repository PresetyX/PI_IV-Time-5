package br.puccampinas.pedeai.session;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("guestSession")
public record GuestSession(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId tableId,
        String mode,
        String name,
        String phone,
        Consent consent,
        Instant createdAt,
        Instant expiresAt) {

    public record Consent(@Field("notify") Boolean notifyCustomer, Boolean history, Instant at) {
    }
}
