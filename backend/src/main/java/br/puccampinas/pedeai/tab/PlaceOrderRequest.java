package br.puccampinas.pedeai.tab;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param expectedTotalCents total que o cliente viu no carrinho, em centavos. O server compara com o total
 *                           calculado a partir dos preços do banco e recusa o pedido se forem diferentes.
 * @param ageConfirmed       o cliente confirmou ter 18 anos ou mais. Obrigatório ser {@code true} quando o pedido
 *                           tem produto alcoólico; ausente vale {@code false}.
 */
public record PlaceOrderRequest(
        @NotEmpty @Size(max = 30) List<@Valid Item> items,
        @NotNull @Min(0) Integer expectedTotalCents,
        Boolean ageConfirmed) {

    public PlaceOrderRequest(List<Item> items, Integer expectedTotalCents) {
        this(items, expectedTotalCents, null);
    }

    public boolean isAgeConfirmed() {
        return Boolean.TRUE.equals(ageConfirmed);
    }

    public record Item(@NotBlank String productId, @Min(1) @Max(20) int quantity, @Size(max = 140) String note) {
    }
}
