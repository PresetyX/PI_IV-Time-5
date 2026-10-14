package br.puccampinas.pedeai.usuario.dto;

import br.puccampinas.pedeai.usuario.Usuario;

public record UsuarioResponse(
        String id,
        String estabelecimentoId,
        String nome,
        String email,
        Usuario.PerfilAcesso perfil,
        boolean ativo
) {
    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getEstabelecimentoId(), u.getNome(), u.getEmail(), u.getPerfil(), u.isAtivo());
    }
}
