package br.puccampinas.pedeai.usuario;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Service
public class JwtService {

    private final String segredo;
    private final long expiracaoMinutos;

    public JwtService(
            @Value("${jwt.secret}") String segredo,
            @Value("${jwt.expiracaoMinutos}") long expiracaoMinutos
    ) {
        if (segredo == null || segredo.isBlank()) {
            throw new IllegalStateException("JWT_SECRET não configurada.");
        }
        this.segredo = segredo;
        this.expiracaoMinutos = expiracaoMinutos;
    }

    public String gerarToken(Usuario usuario) {
        Instant agora = Instant.now();
        Instant expira = agora.plusSeconds(expiracaoMinutos * 60);

        String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = base64Url("""
            {"sub":"%s","estabelecimentoId":"%s","perfil":"%s","iat":%d,"exp":%d}
            """.formatted(
                usuario.getId(),
                usuario.getEstabelecimentoId(),
                usuario.getPerfil(),
                agora.getEpochSecond(),
                expira.getEpochSecond()
        ));

        String assinatura = assinar(header + "." + payload);
        return header + "." + payload + "." + assinatura;
    }

    public long expiracaoEmSegundos() {
        return expiracaoMinutos * 60;
    }

    private String assinar(String dados) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(dados.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao assinar JWT.", e);
        }
    }

    private String base64Url(String valor) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(valor.getBytes(StandardCharsets.UTF_8));
    }
}
