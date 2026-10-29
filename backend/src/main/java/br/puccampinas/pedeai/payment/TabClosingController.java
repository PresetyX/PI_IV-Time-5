package br.puccampinas.pedeai.payment;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/operations/tabs")
public class TabClosingController {

    private final TabClosingService tabClosingService;

    public TabClosingController(TabClosingService tabClosingService) {
        this.tabClosingService = tabClosingService;
    }

    public record CloseTabRequest(@NotBlank String method) {
    }

    @PostMapping("/{tabId}/close")
    public Map<String, Object> close(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String tabId,
            @Valid @RequestBody CloseTabRequest request) {
        return tabClosingService.close(user, tabId, request.method());
    }
}
