package br.puccampinas.pedeai.table;

import jakarta.validation.constraints.NotNull;

public record TableActiveRequest(@NotNull Boolean active) {
}
