/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.session;

import java.time.Instant;

import br.puccampinas.pedeai.table.TableResponse;

/** Resposta ao criar a sessão do cliente: o token de acesso, os dados da sessão e quando ela expira. */
public record SessionResponse(String token, String tokenType, String id, String mode, String name, TableResponse table, Instant expiresAt) {
}
