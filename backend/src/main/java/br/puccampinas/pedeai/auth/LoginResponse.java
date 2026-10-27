package br.puccampinas.pedeai.auth;

import java.time.Instant;

public record LoginResponse(String token, String tokenType, Instant expiresAt, UserInfo user) {

    public record UserInfo(String id, String storeId, String name, String role, boolean mustChangePassword) {
    }
}
