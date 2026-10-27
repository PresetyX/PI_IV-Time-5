package br.puccampinas.pedeai.store;

import java.time.Instant;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("store")
public record Store(
        @Id ObjectId id,
        String slug,
        String name,
        String kind,
        String document,
        String phone,
        Address address,
        String logoUrl,
        String primaryColor,
        String tagline,
        List<OpeningHours> openingHours,
        List<String> serviceModes,
        int serviceFeeBasisPoints,
        int commissionBasisPoints,
        Boolean requireCustomerPhone,
        Instant pausedUntil,
        List<String> pausedScopes,
        boolean isTraining,
        boolean active,
        Instant createdAt,
        Instant updatedAt) {
}
