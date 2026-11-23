/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.server.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import br.puccampinas.pedeai.server.protocol.CommandException;

@DisplayName("OrderValidator - particionamento por categorias de métodos")
class OrderValidatorTest {

    private static final String TWO_ITEMS =
            "[{\"unitPriceCents\":3200,\"quantity\":1,\"options\":[{\"deltaCents\":600}]},"
                    + "{\"unitPriceCents\":800,\"quantity\":2}]";

    private final OrderValidator validator = new OrderValidator();

    private static Map<String, String> params(String items, long total, long computed,
            String openAt, String closeAt, String now) {
        Map<String, String> params = new HashMap<>();
        params.put("items", items);
        params.put("totalCents", String.valueOf(total));
        params.put("computedCents", String.valueOf(computed));
        params.put("openAt", openAt);
        params.put("closeAt", closeAt);
        params.put("now", now);
        return params;
    }

    private static Map<String, String> validOrder() {
        return params(TWO_ITEMS, 5400, 5400, "17:00", "23:00", "20:30");
    }

    private String errorCode(Map<String, String> params) {
        return assertThrows(CommandException.class, () -> validator.validate(params)).getCode();
    }

    @Nested
    @DisplayName("Categoria 1 - leitura e conversão dos parâmetros")
    class ParameterParsing {

        @ParameterizedTest
        @ValueSource(strings = {"items", "totalCents", "computedCents", "openAt", "closeAt", "now"})
        @DisplayName("parâmetro obrigatório ausente é recusado")
        void missingParameter(String key) {
            Map<String, String> params = validOrder();
            params.remove(key);
            assertEquals("INVALID_PARAMS", errorCode(params));
        }

        @Test
        @DisplayName("parâmetro só com espaços conta como ausente")
        void blankParameter() {
            Map<String, String> params = validOrder();
            params.put("now", "   ");
            assertEquals("INVALID_PARAMS", errorCode(params));
        }

        @ParameterizedTest
        @ValueSource(strings = {"não é json", "{\"unitPriceCents\":100}", "[]", "[1, 2]"})
        @DisplayName("items precisa ser uma lista não vazia de objetos")
        void invalidItems(String items) {
            assertEquals("INVALID_PARAMS", errorCode(params(items, 0, 0, "17:00", "23:00", "20:30")));
        }

        @ParameterizedTest
        @CsvSource({"abc, 5400", "-1, 5400", "5400, 12.5"})
        @DisplayName("totais precisam ser inteiros em centavos, sem sinal negativo")
        void invalidCents(String total, String computed) {
            Map<String, String> params = validOrder();
            params.put("totalCents", total);
            params.put("computedCents", computed);
            assertEquals("INVALID_PARAMS", errorCode(params));
        }

        @ParameterizedTest
        @ValueSource(strings = {"25:00", "8h", "20:30:99"})
        @DisplayName("horário fora do formato HH:mm é recusado")
        void invalidTime(String time) {
            Map<String, String> params = validOrder();
            params.put("openAt", time);
            assertEquals("INVALID_PARAMS", errorCode(params));
        }
    }

    @Nested
    @DisplayName("Categoria 2 - regras de cada item")
    class ItemRules {

        private String item(String body) {
            return "[{" + body + "}]";
        }

        @ParameterizedTest
        @CsvSource({"1, 1000", "20, 20000"})
        @DisplayName("quantidade nos limites 1 e 20 é aceita")
        void quantityLimitsAccepted(int quantity, long total) {
            String items = item("\"unitPriceCents\":1000,\"quantity\":" + quantity);
            Map<String, Object> result = validator.validate(params(items, total, total, "00:00", "23:59", "12:00"));
            assertEquals(total, result.get("totalCents"));
        }

        @ParameterizedTest
        @ValueSource(ints = {0, 21, -3})
        @DisplayName("quantidade fora de 1..20 é recusada")
        void quantityOutOfRange(int quantity) {
            String items = item("\"unitPriceCents\":1000,\"quantity\":" + quantity);
            assertEquals("INVALID_PARAMS", errorCode(params(items, 0, 0, "00:00", "23:59", "12:00")));
        }

        @Test
        @DisplayName("preço unitário negativo é recusado")
        void negativePrice() {
            String items = item("\"unitPriceCents\":-100,\"quantity\":1");
            assertEquals("INVALID_PARAMS", errorCode(params(items, 0, 0, "00:00", "23:59", "12:00")));
        }

        @Test
        @DisplayName("quantidade decimal é recusada")
        void decimalQuantity() {
            String items = item("\"unitPriceCents\":100,\"quantity\":1.5");
            assertEquals("INVALID_PARAMS", errorCode(params(items, 150, 150, "00:00", "23:59", "12:00")));
        }

        @Test
        @DisplayName("observação de 140 caracteres passa e de 141 é recusada")
        void noteLength() {
            String ok = item("\"unitPriceCents\":100,\"quantity\":1,\"note\":\"" + "a".repeat(140) + "\"");
            String tooLong = item("\"unitPriceCents\":100,\"quantity\":1,\"note\":\"" + "a".repeat(141) + "\"");
            assertEquals(100L, validator.validate(params(ok, 100, 100, "00:00", "23:59", "12:00")).get("totalCents"));
            assertEquals("INVALID_PARAMS", errorCode(params(tooLong, 100, 100, "00:00", "23:59", "12:00")));
        }

        @Test
        @DisplayName("anomalia: opção com deltaCents negativo é aceita e reduz o preço")
        void negativeOptionDeltaIsAccepted() {
            String items = item("\"unitPriceCents\":1000,\"quantity\":1,\"options\":[{\"deltaCents\":-900}]");
            Map<String, Object> result = validator.validate(params(items, 100, 100, "00:00", "23:59", "12:00"));
            assertEquals(100L, result.get("totalCents"));
        }
    }

    @Nested
    @DisplayName("Categoria 3 - cálculo e conferência do total")
    class TotalCalculation {

        @Test
        @DisplayName("total certo: (3200 + 600) x 1 + 800 x 2 = 5400")
        void matchingTotal() {
            Map<String, Object> result = validator.validate(validOrder());
            assertEquals(true, result.get("valid"));
            assertEquals(5400L, result.get("totalCents"));
        }

        @Test
        @DisplayName("total enviado diferente do calculado pelo backend")
        void totalDiffersFromComputed() {
            assertEquals("TOTAL_MISMATCH", errorCode(params(TWO_ITEMS, 5000, 5400, "17:00", "23:00", "20:30")));
        }

        @Test
        @DisplayName("total do backend diferente da soma dos itens")
        void computedDiffersFromItems() {
            assertEquals("TOTAL_MISMATCH", errorCode(params(TWO_ITEMS, 5300, 5300, "17:00", "23:00", "20:30")));
        }

        @Test
        @DisplayName("soma que estoura o long é recusada sem derrubar o servidor")
        void overflow() {
            String items = "[{\"unitPriceCents\":" + Long.MAX_VALUE + ",\"quantity\":2}]";
            assertEquals("INVALID_PARAMS", errorCode(params(items, 0, 0, "00:00", "23:59", "12:00")));
        }
    }

    @Nested
    @DisplayName("Categoria 4 - regra de horário de funcionamento")
    class OpeningHours {

        private Map<String, String> at(String openAt, String closeAt, String now) {
            return params(TWO_ITEMS, 5400, 5400, openAt, closeAt, now);
        }

        @ParameterizedTest
        @CsvSource({"17:00, 23:00, 17:00", "17:00, 23:00, 22:59", "18:00, 02:00, 23:30", "18:00, 02:00, 01:59"})
        @DisplayName("dentro do horário (inclusive virando a meia-noite) o pedido passa")
        void open(String openAt, String closeAt, String now) {
            assertTrue((Boolean) validator.validate(at(openAt, closeAt, now)).get("valid"));
        }

        @ParameterizedTest
        @CsvSource({"17:00, 23:00, 16:59", "17:00, 23:00, 23:00", "18:00, 02:00, 02:00", "18:00, 02:00, 12:00"})
        @DisplayName("fora do horário o pedido é recusado")
        void closed(String openAt, String closeAt, String now) {
            assertEquals("CLOSED_HOURS", errorCode(at(openAt, closeAt, now)));
        }

        @Test
        @DisplayName("anomalia: abrir e fechar no mesmo horário deixa a casa sempre fechada")
        void sameOpenAndCloseIsAlwaysClosed() {
            assertEquals("CLOSED_HOURS", errorCode(at("00:00", "00:00", "12:00")));
        }

        @Test
        @DisplayName("horário é conferido antes do total")
        void hoursCheckedBeforeTotal() {
            assertEquals("CLOSED_HOURS", errorCode(params(TWO_ITEMS, 1, 5400, "17:00", "23:00", "10:00")));
        }
    }
}
