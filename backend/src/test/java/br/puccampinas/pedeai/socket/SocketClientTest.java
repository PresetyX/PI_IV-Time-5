/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.socket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Cliente contra um {@link ServerSocket} de verdade, sem Spring e sem o server/ do projeto. */
class SocketClientTest {

    private ServerSocket server;
    private Thread acceptor;
    private final AtomicReference<String> received = new AtomicReference<>();

    @AfterEach
    void stop() throws IOException, InterruptedException {
        if (server != null) {
            server.close();
        }
        if (acceptor != null) {
            acceptor.join(5000);
        }
    }

    @Test
    void sendsOneEscapedLineAndReadsTheAnswer() throws IOException {
        startServer(line -> "OK|{\"status\":\"ok\"}");
        Map<String, String> params = new LinkedHashMap<>();
        params.put("note", "a|b\\c");

        SocketResponse response = new SocketClient("127.0.0.1", server.getLocalPort()).send("PING", params);

        assertTrue(response.ok());
        assertEquals("{\"status\":\"ok\"}", response.body());
        assertEquals("PING|note=a\\|b\\\\c", received.get());
    }

    @Test
    void errorLineKeepsCodeAndMessage() throws IOException {
        startServer(line -> "ERROR|TOTAL_MISMATCH|Total 1 does not match | computed 2");

        SocketResponse response = new SocketClient("127.0.0.1", server.getLocalPort()).send("VALIDATE_ORDER", Map.of());

        assertEquals("TOTAL_MISMATCH", response.code());
        assertEquals("Total 1 does not match | computed 2", response.message());
    }

    @Test
    void serverDownIsUnavailable() throws IOException {
        int port;
        try (ServerSocket closed = new ServerSocket(0)) {
            port = closed.getLocalPort();
        }

        assertThrows(SocketUnavailableException.class, () -> new SocketClient("127.0.0.1", port).send("PING", Map.of()));
    }

    @Test
    void silentServerTimesOutInThreeSeconds() throws IOException {
        startServer(line -> null);
        long start = System.nanoTime();

        assertThrows(SocketUnavailableException.class,
                () -> new SocketClient("127.0.0.1", server.getLocalPort()).send("PING", Map.of()));

        long elapsedMillis = (System.nanoTime() - start) / 1_000_000;
        assertTrue(elapsedMillis < SocketClient.TIMEOUT_MILLIS + 1000, "took " + elapsedMillis + " ms");
    }

    @Test
    void lineOutsideTheProtocolIsUnavailable() throws IOException {
        startServer(line -> "HELLO");

        assertThrows(SocketUnavailableException.class,
                () -> new SocketClient("127.0.0.1", server.getLocalPort()).send("PING", Map.of()));
    }

    /** Aceita uma conexão, guarda a linha recebida e responde com {@code answer} (null = não responde). */
    private void startServer(Function<String, String> answer) throws IOException {
        server = new ServerSocket(0);
        acceptor = new Thread(() -> {
            try (Socket socket = server.accept()) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                String line = reader.readLine();
                received.set(line);
                String reply = answer.apply(line);
                if (reply == null) {
                    Thread.sleep(SocketClient.TIMEOUT_MILLIS + 500);
                    return;
                }
                OutputStream out = socket.getOutputStream();
                out.write((reply + "\n").getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (IOException | InterruptedException e) {
                // fim do teste: o servidor foi fechado
            }
        });
        acceptor.start();
    }
}
