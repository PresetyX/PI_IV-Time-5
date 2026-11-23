/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Pedido para entrar numa comanda com o código de convite de 4 dígitos. */
public record JoinTabRequest(@NotBlank @Pattern(regexp = "\\d{4}", message = "must have 4 digits") String code) {
}
