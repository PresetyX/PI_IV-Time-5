/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.server.protocol;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Request - particionamento por atributos")
class RequestTest {

    @Test
    @DisplayName("command: guarda cada comando do enum")
    void commandAttribute() {
        for (Command command : Command.values()) {
            assertEquals(command, new Request(command, Map.of()).command());
        }
    }

    @Test
    @DisplayName("command: anomalia, aceita nulo sem reclamar")
    void nullCommandIsAccepted() {
        assertNull(new Request(null, Map.of()).command());
    }

    @Test
    @DisplayName("params com valor: require devolve o valor")
    void requirePresent() {
        Request request = new Request(Command.VALIDATE_ORDER, Map.of("now", "20:30"));
        assertEquals("20:30", request.require("now"));
    }

    @Test
    @DisplayName("params sem a chave: require lança MISSING_PARAM")
    void requireMissing() {
        Request request = new Request(Command.PING, Map.of());
        assertEquals("MISSING_PARAM", assertThrows(CommandException.class, () -> request.require("now")).getCode());
    }

    @Test
    @DisplayName("params com valor vazio: require lança MISSING_PARAM")
    void requireEmpty() {
        Request request = new Request(Command.PING, Map.of("now", ""));
        assertEquals("MISSING_PARAM", assertThrows(CommandException.class, () -> request.require("now")).getCode());
    }

    @Test
    @DisplayName("params com só espaços: anomalia, require aceita o valor em branco")
    void requireBlankIsAccepted() {
        Request request = new Request(Command.PING, Map.of("now", "   "));
        assertEquals("   ", request.require("now"));
    }

    @Test
    @DisplayName("params nulo: anomalia, require lança NullPointerException")
    void nullParams() {
        Request request = new Request(Command.PING, null);
        assertThrows(NullPointerException.class, () -> request.require("now"));
    }

    @Test
    @DisplayName("params: anomalia, o mapa não é copiado e muda junto com o original")
    void paramsAreNotCopied() {
        Map<String, String> params = new HashMap<>();
        Request request = new Request(Command.PING, params);
        params.put("now", "20:30");
        assertEquals("20:30", request.require("now"));
    }

    @Test
    @DisplayName("igualdade: dois pedidos com os mesmos atributos são iguais")
    void equality() {
        assertEquals(new Request(Command.PING, Map.of("a", "1")), new Request(Command.PING, Map.of("a", "1")));
        assertNotEquals(new Request(Command.PING, Map.of("a", "1")), new Request(Command.PING, Map.of("a", "2")));
    }
}
