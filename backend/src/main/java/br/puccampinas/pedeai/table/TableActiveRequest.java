/*
 * Autor: Vitor Hugo Gilberti
 * RA: 24012762
 */
package br.puccampinas.pedeai.table;

import jakarta.validation.constraints.NotNull;

public record TableActiveRequest(@NotNull Boolean active) {
}
