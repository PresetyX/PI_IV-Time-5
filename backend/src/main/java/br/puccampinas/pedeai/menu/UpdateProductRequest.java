package br.puccampinas.pedeai.menu;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateProductRequest(
        @NotBlank String categoryId,
        @NotBlank @Size(max = 80) String name,
        @Size(max = 140) String description,
        @NotNull @Min(1) Integer priceCents,
        @Size(max = 500) String imageUrl,
        @Min(0) @Max(240) Integer prepMinutes,
        Boolean isAlcoholic,
        Boolean available,
        List<OptionGroup> optionGroups) {
}
