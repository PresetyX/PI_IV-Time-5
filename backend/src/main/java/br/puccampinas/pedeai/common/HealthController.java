package br.puccampinas.pedeai.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final MongoTemplate mongoTemplate;

    public HealthController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> corpo = new LinkedHashMap<>();
        try {
            mongoTemplate.getDb().runCommand(new Document("ping", 1));
            corpo.put("status", "ok");
            corpo.put("banco", "conectado");
            return ResponseEntity.ok(corpo);
        } catch (Exception e) {
            corpo.put("status", "erro");
            corpo.put("banco", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(corpo);
        }
    }
}
