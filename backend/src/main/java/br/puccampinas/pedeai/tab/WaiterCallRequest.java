/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import jakarta.validation.constraints.NotBlank;

/** Pedido do cliente para chamar o garçom, com o tipo do motivo (ex.: CLOSE_BILL). */
public record WaiterCallRequest(@NotBlank String type) {
}
