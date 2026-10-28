package br.puccampinas.pedeai.socket;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.puccampinas.pedeai.common.ServerUnavailableException;

@Component
public class SocketClient {

    private static final int TIMEOUT_MILLIS = 3000;

    private final String host;
    private final int port;

    public SocketClient(@Value("${socket.host}") String host, @Value("${socket.port}") int port) {
        this.host = host;
        this.port = port;
    }

    public SocketResponse send(String command, Map<String, String> params) {
        String line = buildLine(command, params);
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(TIMEOUT_MILLIS);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MILLIS);
            // O prazo de 3 s vale para a conversa inteira, não só para cada etapa.
            long remainingMillis = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
            if (remainingMillis <= 0) {
                throw new SocketTimeoutException("Server did not answer within " + TIMEOUT_MILLIS + " ms");
            }
            socket.setSoTimeout((int) remainingMillis);

            BufferedWriter writer = new BufferedWriter(
                    new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));
            writer.write(line);
            writer.write('\n');
            writer.flush();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String response = reader.readLine();
            if (response == null) {
                throw new ServerUnavailableException("Server closed the connection without responding");
            }
            return SocketResponse.parse(response);
        } catch (IOException e) {
            throw new ServerUnavailableException("Server unreachable at " + host + ":" + port, e);
        }
    }

    private static String buildLine(String command, Map<String, String> params) {
        StringBuilder line = new StringBuilder(command);
        params.forEach((key, value) -> line.append('|').append(key).append('=').append(escape(value)));
        return line.toString();
    }

    private static String escape(String value) {
        StringBuilder escaped = new StringBuilder();
        for (char c : value.toCharArray()) {
            switch (c) {
                case '\\' -> escaped.append("\\\\");
                case '|' -> escaped.append("\\|");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                default -> escaped.append(c);
            }
        }
        return escaped.toString();
    }
}
