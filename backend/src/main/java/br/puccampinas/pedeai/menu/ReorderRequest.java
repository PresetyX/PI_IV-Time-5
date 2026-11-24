/*
 * Autor: Vitor Hugo Gilberti
 * RA: 24012762
 */
package br.puccampinas.pedeai.menu;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public record ReorderRequest(@NotNull List<String> ids) {
}
