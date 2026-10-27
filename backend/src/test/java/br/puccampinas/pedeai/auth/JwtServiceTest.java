package br.puccampinas.pedeai.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import javax.crypto.SecretKey;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import br.puccampinas.pedeai.config.JwtConfig;
import br.puccampinas.pedeai.user.User;

class JwtServiceTest {

    private static final String SECRET = "a-test-secret-with-more-than-32-bytes";

    private final JwtConfig jwtConfig = new JwtConfig();
    private final SecretKey key = jwtConfig.jwtSecretKey(SECRET);
    private final JwtDecoder decoder = jwtConfig.jwtDecoder(key);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId userId = new ObjectId();

    @Test
    void tokenCarriesUserIdStoreIdAndRole() {
        JwtService service = serviceAt(Instant.now(), 60);

        IssuedToken token = service.issue(user("WAITER"));
        Jwt jwt = decoder.decode(token.value());
        UsernamePasswordAuthenticationToken authentication = new AuthenticatedUserConverter().convert(jwt);

        AuthenticatedUser principal = (AuthenticatedUser) authentication.getPrincipal();
        assertEquals(userId, principal.userId());
        assertEquals(storeId, principal.storeId());
        assertEquals("WAITER", principal.role());
        assertTrue(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_WAITER")));
    }

    @Test
    void expirationFollowsConfiguredMinutes() {
        Instant now = Instant.parse("2026-10-26T12:00:00Z");

        IssuedToken token = serviceAt(now, 480).issue(user("OWNER"));

        assertEquals(now.plusSeconds(480 * 60), token.expiresAt());
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService service = serviceAt(Instant.now().minusSeconds(7200), 60);

        IssuedToken token = service.issue(user("OWNER"));

        assertThrows(BadJwtException.class, () -> decoder.decode(token.value()));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        SecretKey otherKey = jwtConfig.jwtSecretKey("another-secret-with-more-than-32-bytes!");
        JwtService foreign = new JwtService(jwtConfig.jwtEncoder(otherKey), Clock.systemUTC(), 60);

        IssuedToken token = foreign.issue(user("OWNER"));

        assertThrows(BadJwtException.class, () -> decoder.decode(token.value()));
    }

    @Test
    void shortSecretFailsFast() {
        assertThrows(IllegalStateException.class, () -> jwtConfig.jwtSecretKey("short"));
    }

    private JwtService serviceAt(Instant now, long minutes) {
        return new JwtService(jwtConfig.jwtEncoder(key), Clock.fixed(now, ZoneOffset.UTC), minutes);
    }

    private User user(String role) {
        return new User(userId, storeId, "Name", "a@b.com", "hash", role, true, false, 0, null, null, null, null);
    }
}
