package br.puccampinas.pedeai.menu;

import java.time.Instant;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("product")
public record Product(
        @Id ObjectId id,
        ObjectId storeId,
        ObjectId categoryId,
        String name,
        String description,
        int priceCents,
        String imageUrl,
        Integer prepMinutes,
        boolean available,
        Instant unavailableSince,
        Boolean isAlcoholic,
        int position,
        List<OptionGroup> optionGroups) {
}
