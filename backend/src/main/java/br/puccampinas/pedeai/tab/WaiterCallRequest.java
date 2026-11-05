package br.puccampinas.pedeai.tab;

import jakarta.validation.constraints.NotBlank;

public record WaiterCallRequest(@NotBlank String type) {
}
