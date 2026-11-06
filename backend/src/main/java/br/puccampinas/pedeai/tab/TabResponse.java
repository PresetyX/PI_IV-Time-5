package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/**
 * [Mateus · Card 5] Alteração: {@code mode} (TABLE ou COUNTER) e {@code pickupTicket} (senha do balcão, só depois do
 * primeiro pedido) foram acrescentados no fim. Na comanda de balcão, {@code tableNumber} é 0.
 */
public record TabResponse(
        String id,
        int tableNumber,
        String ownerName,
        boolean owner,
        String joinCode,
        Instant joinCodeExpiresAt,
        int totalCents,
        Instant openedAt,
        List<Member> members,
        String mode,
        Integer pickupTicket) {

    public record Member(String sessionId, String name, boolean owner, int totalCents, Instant joinedAt) {
    }
}
