package br.puccampinas.pedeai.table;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TableRequest(
        @NotNull @Min(1) @Max(999) Integer number,
        @Size(max = 30) String nickname,
        @Min(1) @Max(50) Integer seats) {
}
