package br.puccampinas.pedeai.table;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("table")
public record Table(
        @Id ObjectId id,
        ObjectId storeId,
        int number,
        String nickname,
        Integer seats,
        String token,
        boolean active,
        Instant createdAt) {
}
