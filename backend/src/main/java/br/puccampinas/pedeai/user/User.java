package br.puccampinas.pedeai.user;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("user")
public record User(
        @Id ObjectId id,
        ObjectId storeId,
        String name,
        String email,
        String passwordHash,
        String role,
        boolean active,
        Boolean mustChangePassword,
        Integer failedAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt) {
}
