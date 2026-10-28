package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

public record TabResponse(
        String id,
        int tableNumber,
        String ownerName,
        boolean owner,
        String joinCode,
        Instant joinCodeExpiresAt,
        int totalCents,
        Instant openedAt,
        List<Member> members) {

    public record Member(String sessionId, String name, boolean owner, int totalCents, Instant joinedAt) {
    }
}
