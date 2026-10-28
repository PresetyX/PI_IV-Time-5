package br.puccampinas.pedeai.tab;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record PlaceOrderRequest(@NotEmpty @Size(max = 30) List<@Valid Item> items) {

    public record Item(@NotBlank String productId, @Min(1) @Max(20) int quantity, @Size(max = 140) String note) {
    }
}
