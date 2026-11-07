package br.puccampinas.pedeai.menu;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public record ReorderRequest(@NotNull List<String> ids) {
}
