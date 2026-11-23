/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;

/** Dados de um chamado de garçom devolvidos pela API. */
public record WaiterCallResponse(String id, String type, String reason, String status, Instant createdAt,
        Instant resolvedAt) {
}
