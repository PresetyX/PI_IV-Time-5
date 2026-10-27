package br.puccampinas.pedeai.auth;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/api/auth/me")
    public Map<String, String> me(@AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("userId", user.userId().toHexString());
        body.put("storeId", user.storeId().toHexString());
        body.put("role", user.role());
        return body;
    }
}
