package br.puccampinas.pedeai.usuario.dto;

import br.puccampinas.pedeai.usuario.Usuario;

public record LoginResponse(
        String token,
        String tipo,
        long expiraEmSegundos,
        UsuarioResponse usuario
) {
    public static LoginResponse de(String token, long expiraEmSegundos, Usuario usuario) {
        return new LoginResponse(token, "Bearer", expiraEmSegundos, UsuarioResponse.de(usuario));
    }
}
