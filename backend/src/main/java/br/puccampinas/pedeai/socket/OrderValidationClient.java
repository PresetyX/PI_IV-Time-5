/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.socket;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Pede ao {@code server/} o {@code VALIDATE_ORDER} de um pedido e diz o que ele respondeu.
 *
 * <p>Java puro (sem Spring, sem Jackson): o JSON dos itens é montado aqui mesmo e a resposta é lida pelo
 * protocolo de texto. Só devolve {@link Status#VALID} quando o server respondeu {@code OK} com
 * {@code "valid":true}; qualquer outra coisa (recusa, timeout, resposta estranha) é outro status, para o pedido
 * nunca ser gravado sem validação. Quem chama decide a resposta HTTP de cada status.
 */

public class OrderValidationClient {

    static final String COMMAND = "VALIDATE_ORDER";
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
    private static final Pattern VALID_TRUE = Pattern.compile("\"valid\"\\s*:\\s*true");

    private final SocketClient socketClient;

    public OrderValidationClient(SocketClient socketClient) {
        this.socketClient = socketClient;
    }

    /** Resultado da validação. A mensagem do server ou o motivo do erro*/
    public enum Status {
        /* O server conferiu e aprovou: pode gravar. */
        VALID,
        
        /** o total que o cliente viu não bate com os preços do banco. */
        PRICE_CHANGED,

        /** fora do horário de pedidos da loja. */
        CLOSED_HOURS,
        
        /** quantidade, observação ou valores fora das regras. */
        INVALID,
        
        /** server fora do ar ou resposta inesperada. */
        UNAVAILABLE
    }

    public record Result(Status status, String detail) {

        public boolean valid() {
            return status == Status.VALID;
        }
    }

    public Result validate(OrderValidation order) {
        
        SocketResponse response;
        
        try {
            response = socketClient.send(COMMAND, params(order));
        } catch (SocketUnavailableException e) {
            return new Result(Status.UNAVAILABLE, e.getMessage());
        }
        
        if (!response.ok()) {
            String code = response.code() == null ? "" : response.code();
            return switch (code) {
                case "TOTAL_MISMATCH" -> new Result(Status.PRICE_CHANGED, response.message());
                case "CLOSED_HOURS" -> new Result(Status.CLOSED_HOURS, response.message());
                case "INVALID_PARAMS" -> new Result(Status.INVALID, response.message());
                default -> new Result(Status.UNAVAILABLE, code + ": " + response.message());
            };
        }
        
        if (response.body() == null || !VALID_TRUE.matcher(response.body()).find()) {
            return new Result(Status.UNAVAILABLE, "Unexpected validation body: " + response.body());
        }
        
        return new Result(Status.VALID, null);
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

    /** retorno um texto JSON representando os itens do pedido. */
    static String itemsJson(List<Item> items) {
        
        StringBuilder json = new StringBuilder("[");
        
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            
            if (i > 0) {
                json.append(',');
            }
            
            json.append("{\"unitPriceCents\":").append(item.unitPriceCents())
                    .append(",\"quantity\":").append(item.quantity());
            
            if (item.note() != null && !item.note().isEmpty()) {
                json.append(",\"note\":");
                appendString(json, item.note());
            }
            
            json.append(",\"options\":[");
            List<Integer> deltas = item.optionDeltasCents() == null ? List.of() : item.optionDeltasCents();
            
            for (int j = 0; j < deltas.size(); j++) {
                if (j > 0) {
                    json.append(',');
                }
                json.append("{\"deltaCents\":").append(deltas.get(j)).append('}');
            }
            json.append("]}");
        }
    
        return json.append(']').toString();
    }

    /** Texto JSON entre aspas, com os escapes que o {@code SimpleJson} do server entende. */
    private static void appendString(StringBuilder json, String text) {
        json.append('"');
        for (char c : text.toCharArray()) {
            switch (c) {
                case '"' -> json.append("\\\"");
                case '\\' -> json.append("\\\\");
                case '\n' -> json.append("\\n");
                case '\r' -> json.append("\\r");
                case '\t' -> json.append("\\t");
                default -> {
                    if (c < 0x20) {
                        json.append(String.format("\\u%04x", (int) c));
                    } else {
                        json.append(c);
                    }
                }
            }
        }
        json.append('"');
    }

    /** Pedido a validar. Horários em {@code HH:mm}, já no fuso da loja. */
    public record OrderValidation(List<Item> items, long totalCents, long computedCents, String openAt,
            String closeAt, LocalTime now) {
    }

    public record Item(int unitPriceCents, int quantity, String note, List<Integer> optionDeltasCents) {
    }
}
