package br.puccampinas.pedeai.menu;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("category")
public record Category(
        @Id ObjectId id,
        ObjectId storeId,
        String name,
        int position,
        boolean visible) {
}
