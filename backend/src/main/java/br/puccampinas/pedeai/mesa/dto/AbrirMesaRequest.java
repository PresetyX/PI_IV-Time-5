package br.puccampinas.pedeai.mesa.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AbrirMesaRequest(
        @NotBlank String estabelecimentoId,
        @Min(1) int numero
) {}
