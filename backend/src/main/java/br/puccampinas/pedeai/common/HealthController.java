package br.puccampinas.pedeai.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.puccampinas.pedeai.socket.SocketClient;
import br.puccampinas.pedeai.socket.SocketResponse;

@RestController
public class HealthController {

    private final SocketClient socketClient;
    private final ObjectMapper objectMapper;

    public HealthController(SocketClient socketClient, ObjectMapper objectMapper) {
        this.socketClient = socketClient;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> body = new LinkedHashMap<>();
        try {
            SocketResponse response = socketClient.send("PING", Map.of());
            String database = response.ok() ? readDatabaseState(response.body()) : "unknown";
            boolean healthy = response.ok() && "connected".equals(database);
            body.put("status", healthy ? "ok" : "error");
            body.put("server", "up");
            body.put("database", database);
            return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
        } catch (ServerUnavailableException e) {
            body.put("status", "error");
            body.put("server", "down");
            body.put("database", "unknown");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
        }
    }

    private String readDatabaseState(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            return node.path("database").asText("unknown");
        } catch (JsonProcessingException e) {
            return "unknown";
        }
    }
}
