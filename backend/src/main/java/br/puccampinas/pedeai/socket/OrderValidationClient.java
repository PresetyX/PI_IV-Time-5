package br.puccampinas.pedeai.socket;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.OrderRejectedException;
import br.puccampinas.pedeai.common.ServerUnavailableException;

/**
 * Pede ao {@code server/} o {@code VALIDATE_ORDER} de um pedido. Só retorna normalmente quando o server
 * respondeu que o pedido é válido; qualquer outra coisa (recusa, timeout, resposta estranha) vira exceção,
 * para o pedido nunca ser gravado sem validação.
 */
@Component
public class OrderValidationClient {

    static final String COMMAND = "VALIDATE_ORDER";
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final SocketClient socketClient;
    private final ObjectMapper objectMapper;

    public OrderValidationClient(SocketClient socketClient, ObjectMapper objectMapper) {
        this.socketClient = socketClient;
        this.objectMapper = objectMapper;
    }

    public void validate(OrderValidation order) {
        SocketResponse response;
        try {
            response = socketClient.send(COMMAND, params(order));
        } catch (ServerUnavailableException e) {
            throw unavailable(e);
        }
        if (!response.ok()) {
            throw rejection(response);
        }
        if (!isValid(response.body())) {
            throw unavailable(new IllegalStateException("Unexpected validation body: " + response.body()));
        }
    }

    Map<String, String> params(OrderValidation order) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("items", itemsJson(order.items()));
        params.put("totalCents", Long.toString(order.totalCents()));
        params.put("computedCents", Long.toString(order.computedCents()));
        params.put("openAt", order.openAt());
        params.put("closeAt", order.closeAt());
        params.put("now", order.now().format(HH_MM));
        return params;
    }

    private String itemsJson(List<Item> items) {
        List<Map<String, Object>> json = items.stream().map(item -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("unitPriceCents", item.unitPriceCents());
            row.put("quantity", item.quantity());
            if (item.note() != null && !item.note().isEmpty()) {
                row.put("note", item.note());
            }
            row.put("options", item.optionDeltasCents().stream().map(delta -> Map.of("deltaCents", delta)).toList());
            return row;
        }).toList();
        try {
            return objectMapper.writeValueAsString(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize order items", e);
        }
    }

    private boolean isValid(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            return node != null && node.path("valid").asBoolean(false);
        } catch (JsonProcessingException e) {
            return false;
        }
    }

    private static RuntimeException rejection(SocketResponse response) {
        String code = response.code() == null ? "" : response.code();
        return switch (code) {
            case "TOTAL_MISMATCH" -> new OrderRejectedException(HttpStatus.CONFLICT,
                    OrderRejectedException.PRICE_CHANGED,
                    "O valor do pedido mudou. Confira o carrinho e envie de novo.");
            case "CLOSED_HOURS" -> new OrderRejectedException(HttpStatus.CONFLICT,
                    OrderRejectedException.STORE_CLOSED,
                    "A casa não está aceitando pedidos neste horário.");
            case "INVALID_PARAMS" -> new InvalidRequestException(response.message());
            default -> unavailable(new IllegalStateException(code + ": " + response.message()));
        };
    }

    private static OrderRejectedException unavailable(Throwable cause) {
        return new OrderRejectedException(HttpStatus.SERVICE_UNAVAILABLE,
                OrderRejectedException.VALIDATION_UNAVAILABLE,
                "Não foi possível conferir o pedido agora. Tente de novo em instantes.", cause);
    }

    /** Pedido a validar. Horários em {@code HH:mm}, já no fuso da loja. */
    public record OrderValidation(List<Item> items, long totalCents, long computedCents, String openAt,
            String closeAt, LocalTime now) {
    }

    public record Item(int unitPriceCents, int quantity, String note, List<Integer> optionDeltasCents) {
    }
}
