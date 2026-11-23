/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;
import java.util.List;

/**
 * Comanda vista pelo cliente. {@code mode} é TABLE ou COUNTER; {@code pickupTicket} é a senha do balcão, que só
 * existe depois do primeiro pedido. Na comanda de balcão, {@code tableNumber} é 0.
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
