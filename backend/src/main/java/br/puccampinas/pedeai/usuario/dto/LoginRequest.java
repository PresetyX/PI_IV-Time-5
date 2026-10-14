package br.puccampinas.pedeai.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String estabelecimentoId,
        @NotBlank @Email String email,
        @NotBlank String senha
) {}
