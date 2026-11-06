package br.puccampinas.pedeai.socket;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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

    /**
     * Envia uma linha e lê a resposta. Conectar, enviar e ler cabem juntos em {@link #TIMEOUT_MILLIS}:
     * sem resposta completa nesse prazo, lança {@link ServerUnavailableException}.
     */
    public SocketResponse send(String command, Map<String, String> params) {
        String line = buildLine(command, params);
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(TIMEOUT_MILLIS);
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), remainingMillis(deadline));

            OutputStream out = socket.getOutputStream();
            out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
            out.flush();

            String response = readLine(socket, deadline);
            if (response == null) {
                throw new ServerUnavailableException("Server closed the connection without responding");
            }
            return SocketResponse.parse(response);
        } catch (SocketTimeoutException e) {
            throw new ServerUnavailableException("Server did not respond within " + TIMEOUT_MILLIS + " ms", e);
        } catch (IOException e) {
            throw new ServerUnavailableException("Server unreachable at " + host + ":" + port, e);
        }
    }

    private static String readLine(Socket socket, long deadline) throws IOException {
        InputStream in = socket.getInputStream();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        while (true) {
            socket.setSoTimeout(remainingMillis(deadline));
            int b = in.read();
            if (b == -1) {
                return bytes.size() == 0 ? null : decode(bytes);
            }
            if (b == '\n') {
                return decode(bytes);
            }
            bytes.write(b);
        }
    }

    private static String decode(ByteArrayOutputStream bytes) {
        String text = bytes.toString(StandardCharsets.UTF_8);
        return text.endsWith("\r") ? text.substring(0, text.length() - 1) : text;
    }

    private static int remainingMillis(long deadline) throws SocketTimeoutException {
        long remaining = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
        if (remaining <= 0) {
            throw new SocketTimeoutException("Deadline exceeded");
        }
        return (int) remaining;
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
