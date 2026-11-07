package br.puccampinas.pedeai.payment;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;

@RestController
public class PixController {

    private final PixService pixService;

    public PixController(PixService pixService) {
        this.pixService = pixService;
    }

    @GetMapping("/api/tabs/mine/pix")
    public PixResponse pix(@AuthenticationPrincipal AuthenticatedUser guest) {
        return pixService.pixOfMyTab(guest);
    }
}
