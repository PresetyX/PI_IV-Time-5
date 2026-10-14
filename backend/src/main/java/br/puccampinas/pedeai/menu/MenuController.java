package br.puccampinas.pedeai.menu;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.socket.SocketClient;
import br.puccampinas.pedeai.socket.SocketResponse;

@RestController
public class MenuController {

    private final SocketClient socketClient;

    public MenuController(SocketClient socketClient) {
        this.socketClient = socketClient;
    }

    @GetMapping(value = "/api/public/tenants/{slug}/menu", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> list(@PathVariable String slug) {
        SocketResponse response = socketClient.send("MENU_LIST", Map.of("tenant", slug));
        if (!response.ok()) {
            throw response.toException();
        }
        return ResponseEntity.ok(response.body());
    }
}
