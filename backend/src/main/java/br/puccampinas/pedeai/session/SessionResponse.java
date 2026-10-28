package br.puccampinas.pedeai.session;

import java.time.Instant;

public record SessionResponse(String token, String tokenType, Instant expiresAt, SessionInfo session) {

    public record SessionInfo(String id, String storeId, String tableId, int tableNumber, String name) {
    }
}
