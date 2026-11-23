/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import br.puccampinas.pedeai.server.infra.SocketServer;
import br.puccampinas.pedeai.server.protocol.ConnectionHandler;
import br.puccampinas.pedeai.server.protocol.SimpleJson;
import br.puccampinas.pedeai.server.service.OrderValidator;

@DisplayName("Interclasse - serviço VALIDATE_ORDER pelo socket")
class ValidateOrderInterclassTest {

    private static final String ITEMS =
            "[{\"unitPriceCents\":3200,\"quantity\":1,\"options\":[{\"deltaCents\":600}]},"
                    + "{\"unitPriceCents\":800,\"quantity\":2}]";

    private static SocketServer server;
    private static int port;

    @BeforeAll
    static void startServer() throws Exception {
        try (ServerSocket probe = new ServerSocket(0)) {
            port = probe.getLocalPort();
        }
        OrderValidator orderValidator = new OrderValidator();
        server = new SocketServer(port, socket -> new ConnectionHandler(socket, orderValidator));
        CompletableFuture.runAsync(() -> {
            try {
                server.start();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
        for (int i = 0; i < 100; i++) {
            try {
                send("PING");
                return;
            } catch (IOException e) {
                Thread.sleep(20);
            }
        }
    }

    @AfterAll
    static void stopServer() {
        server.stop();
    }

    private static String send(String line) throws IOException {
        try (Socket socket = new Socket("localhost", port)) {
            Writer writer = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);
            writer.write(line + "\n");
            writer.flush();
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            return reader.readLine();
        }
    }

    @Test
    @DisplayName("cenário normal: pedido de R$ 54,00 dentro do horário é aprovado")
    void validOrderIsApproved() throws IOException {
        String response = send("VALIDATE_ORDER|items=" + ITEMS
                + "|totalCents=5400|computedCents=5400|openAt=17:00|closeAt=23:00|now=20:30");

        assertTrue(response.startsWith("OK|"), response);
        Object body = SimpleJson.parse(response.substring(3));
        assertEquals(Map.of("valid", true, "totalCents", 5400L), body);
    }

    @Test
    @DisplayName("cenário de erro: total do carrinho diferente do calculado é recusado com TOTAL_MISMATCH")
    void wrongTotalIsRejected() throws IOException {
        String response = send("VALIDATE_ORDER|items=" + ITEMS
                + "|totalCents=5000|computedCents=5400|openAt=17:00|closeAt=23:00|now=20:30");

        List<String> parts = List.of(response.split("\\|", 3));
        assertEquals("ERROR", parts.get(0));
        assertEquals("TOTAL_MISMATCH", parts.get(1));
        assertEquals("Total 5000 does not match computed 5400 (items sum 5400)", parts.get(2));
    }
}
