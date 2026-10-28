package br.puccampinas.pedeai.tab;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record JoinTabRequest(@NotBlank @Pattern(regexp = "\\d{4}", message = "must have 4 digits") String code) {
}
