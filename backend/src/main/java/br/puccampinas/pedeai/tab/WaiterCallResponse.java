/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.time.Instant;

public record WaiterCallResponse(String id, String type, String reason, String status, Instant createdAt,
        Instant resolvedAt) {
}
