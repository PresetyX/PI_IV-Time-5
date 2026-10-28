package br.puccampinas.pedeai.order;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Pedido enviado pelo carrinho. O cliente nunca manda preço de item: só o que ele escolheu e o total que
 * viu na tela. O backend recalcula tudo com o banco e o server de validação confere o total.
 */
public record CreateOrderRequest(
        @NotBlank String tabId,
        @NotEmpty @Size(max = 25) List<@Valid @NotNull Item> items,
        @NotNull @PositiveOrZero Integer totalCents,
        Boolean ageConfirmed) {

    // Limites: 25 itens cabem na linha de 8192 caracteres do socket; quantidade e observação seguem o server.

    public record Item(
            @NotBlank String productId,
            @Min(1) @Max(20) int quantity,
            @Size(max = 140) String note,
            List<@Valid @NotNull Choice> options) {
    }

    public record Choice(@NotBlank String group, @NotBlank String label) {
    }
}
