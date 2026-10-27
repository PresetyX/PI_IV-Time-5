package br.puccampinas.pedeai.auth;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

public class AuthenticatedUserConverter implements Converter<Jwt, UsernamePasswordAuthenticationToken> {

    @Override
    public UsernamePasswordAuthenticationToken convert(Jwt jwt) {
        String role = jwt.getClaimAsString(JwtService.CLAIM_ROLE);
        AuthenticatedUser principal = new AuthenticatedUser(
                new ObjectId(jwt.getSubject()),
                new ObjectId(jwt.getClaimAsString(JwtService.CLAIM_STORE_ID)),
                role);
        return new UsernamePasswordAuthenticationToken(
                principal, jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
}
