package br.puccampinas.pedeai.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateSessionRequest(
        @NotBlank @Size(max = 40) String storeSlug,
        @NotBlank @Pattern(regexp = "TABLE|COUNTER|DELIVERY") String mode,
        @Size(max = 64) String tableToken,
        @NotBlank @Size(max = 60) String name,
        @Size(max = 20) String phone) {
}
