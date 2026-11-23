/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;

public record TabSummary(
        String id,
        String ownerName,
        int peopleCount,
        int totalCents,
        Instant openedAt,
        boolean mine) {
}
