package br.puccampinas.pedeai.mesa.dto;

import br.puccampinas.pedeai.mesa.Mesa;

import java.time.Instant;

public record MesaResponse(
        String id,
        String estabelecimentoId,
        int numero,
        Mesa.StatusMesa status,
        String sessaoId,
        Instant abertaEm
) {
    public static MesaResponse de(Mesa mesa) {
        return new MesaResponse(
                mesa.getId(),
                mesa.getEstabelecimentoId(),
                mesa.getNumero(),
                mesa.getStatus(),
                mesa.getSessaoId(),
                mesa.getAbertaEm()
        );
    }
}
