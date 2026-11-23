/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;

/**
 * Resumo de uma comanda aberta, usado na lista de comandas da mesa.
 *
 * @param peopleCount dono mais participantes ativos
 * @param mine se quem pediu a lista faz parte dessa comanda
 */
public record TabSummary(
        String id,
        String ownerName,
        int peopleCount,
        int totalCents,
        Instant openedAt,
        boolean mine) {
}
