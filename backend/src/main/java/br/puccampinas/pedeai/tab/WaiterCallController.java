package br.puccampinas.pedeai.tab;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;

/** Lado da equipe dos chamados de garçom. O lado do cliente fica em {@link TabController}. */
@RestController
@RequestMapping("/api/operations/tabs")
public class WaiterCallController {

    private final WaiterCallService waiterCallService;

    public WaiterCallController(WaiterCallService waiterCallService) {
        this.waiterCallService = waiterCallService;
    }

    @PostMapping("/{tabId}/calls/{callId}/resolve")
    public WaiterCallResponse resolve(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String tabId,
            @PathVariable String callId) {
        return waiterCallService.resolve(user, tabId, callId);
    }
}
