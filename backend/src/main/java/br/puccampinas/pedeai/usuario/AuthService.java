package br.puccampinas.pedeai.usuario;

import br.puccampinas.pedeai.usuario.dto.LoginRequest;
import br.puccampinas.pedeai.usuario.dto.LoginResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwt) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarios
                .findByEstabelecimentoIdAndEmailIgnoreCase(request.estabelecimentoId(), request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "credenciais_invalidas"));

        if (!usuario.isAtivo() || !encoder.matches(request.senha(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "credenciais_invalidas");
        }

        return LoginResponse.de(jwt.gerarToken(usuario), jwt.expiracaoEmSegundos(), usuario);
    }
}
