package br.puccampinas.pedeai.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OpenSessionRequest(
        @NotBlank String tableToken,
        @NotBlank @Size(max = 60) String name,
        @Size(max = 20) String phone) {
}
