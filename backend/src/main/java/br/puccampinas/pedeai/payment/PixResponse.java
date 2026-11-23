/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.payment;

/** Resposta do Pix: comanda, loja, valor em centavos e o texto copia e cola (nulo se o total for zero). */
public record PixResponse(String tabId, String storeName, int amountCents, String payload) {
}
