package br.puccampinas.pedeai.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.session.GuestSession;
import br.puccampinas.pedeai.user.User;

@Service
public class JwtService {

    public static final String CLAIM_STORE_ID = "storeId";
    public static final String CLAIM_ROLE = "role";
    public static final String ROLE_GUEST = "GUEST";

    private final JwtEncoder jwtEncoder;
    private final Clock clock;
    private final Duration expiration;

    public JwtService(JwtEncoder jwtEncoder, Clock clock,
            @Value("${jwt.expirationMinutes}") long expirationMinutes) {
        this.jwtEncoder = jwtEncoder;
        this.clock = clock;
        this.expiration = Duration.ofMinutes(expirationMinutes);
    }

    public IssuedToken issue(User user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(expiration);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.id().toHexString())
                .claim(CLAIM_STORE_ID, user.storeId().toHexString())
                .claim(CLAIM_ROLE, user.role())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public IssuedToken issueGuest(GuestSession session) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(session.id().toHexString())
                .claim(CLAIM_STORE_ID, session.storeId().toHexString())
                .claim(CLAIM_ROLE, ROLE_GUEST)
                .issuedAt(clock.instant())
                .expiresAt(session.expiresAt())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, session.expiresAt());
    }
}
