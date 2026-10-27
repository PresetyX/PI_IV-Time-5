package br.puccampinas.pedeai.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.socket.SocketClient;
import br.puccampinas.pedeai.socket.SocketResponse;

@RestController
public class HealthController {

    private final SocketClient socketClient;
    private final MongoTemplate mongoTemplate;

    public HealthController(SocketClient socketClient, MongoTemplate mongoTemplate) {
        this.socketClient = socketClient;
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        String server = serverState();
        String database = databaseState();
        boolean healthy = "up".equals(server) && "connected".equals(database);

        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", healthy ? "ok" : "error");
        body.put("server", server);
        body.put("database", database);
        return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private String serverState() {
        try {
            SocketResponse response = socketClient.send("PING", Map.of());
            return response.ok() ? "up" : "error";
        } catch (ServerUnavailableException e) {
            return "down";
        }
    }

    private String databaseState() {
        try {
            mongoTemplate.getDb().runCommand(new Document("ping", 1));
            return "connected";
        } catch (RuntimeException e) {
            return "disconnected";
        }
    }
}
