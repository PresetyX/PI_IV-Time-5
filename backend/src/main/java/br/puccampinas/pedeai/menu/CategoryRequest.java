package br.puccampinas.pedeai.menu;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(@NotBlank @Size(max = 40) String name, Boolean visible) {
}
