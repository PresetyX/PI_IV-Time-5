/*
 * Autor: Vitor Hugo Gilberti
 * RA: 24012762
 */
package br.puccampinas.pedeai.menu;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(@NotNull Boolean available) {
}
