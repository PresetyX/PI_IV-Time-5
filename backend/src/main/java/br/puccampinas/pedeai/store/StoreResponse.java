package br.puccampinas.pedeai.store;

import java.util.List;

public record StoreResponse(
        String id,
        String slug,
        String name,
        String kind,
        String tagline,
        String logoUrl,
        String primaryColor,
        Address address,
        List<OpeningHours> openingHours,
        List<String> serviceModes,
        int serviceFeeBasisPoints,
        boolean requireCustomerPhone,
        List<String> highlights,
        Integer averagePrepMinutes,
        OpeningStatus status) {
}
