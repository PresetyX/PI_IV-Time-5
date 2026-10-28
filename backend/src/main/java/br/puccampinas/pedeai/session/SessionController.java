package br.puccampinas.pedeai.session;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping("/api/public/stores/{slug}/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse open(@PathVariable String slug, @Valid @RequestBody OpenSessionRequest request) {
        return sessionService.open(slug, request);
    }
}
