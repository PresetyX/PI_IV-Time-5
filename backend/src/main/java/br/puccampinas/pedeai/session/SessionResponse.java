package br.puccampinas.pedeai.session;

import java.time.Instant;

import br.puccampinas.pedeai.table.TableResponse;

public record SessionResponse(String id, String mode, String name, TableResponse table, Instant expiresAt) {
}
