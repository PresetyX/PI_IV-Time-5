package br.puccampinas.pedeai.server.protocol;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import br.puccampinas.pedeai.server.service.OrderValidator;

public class ConnectionHandler implements Runnable {

    private static final Logger LOGGER = Logger.getLogger(ConnectionHandler.class.getName());
    private static final int READ_TIMEOUT_MILLIS = 10_000;
    private static final int MAX_LINE_LENGTH = 8192;

    private final Socket socket;
    private final OrderValidator orderValidator;

    public ConnectionHandler(Socket socket, OrderValidator orderValidator) {
        this.socket = socket;
        this.orderValidator = orderValidator;
    }

    @Override
    public void run() {
        try (Socket connection = socket) {
            connection.setSoTimeout(READ_TIMEOUT_MILLIS);
            Reader reader = new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8);
            Writer writer = new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8);

            String line = readLine(reader);
            if (line == null) {
                return;
            }
            long start = System.nanoTime();
            String response = process(line);
            writer.write(response);
            writer.write('\n');
            writer.flush();
            long millis = (System.nanoTime() - start) / 1_000_000;
            String from = connection.getInetAddress() == null ? "?" : connection.getInetAddress().getHostAddress();
            LOGGER.info(() -> commandOf(line) + " de " + from + " -> " + resultOf(response) + " (" + millis + " ms)");
        } catch (IOException e) {
            LOGGER.log(Level.FINE, "Connection error", e);
        }
    }

    private String process(String line) {
        try {
            Request request = Protocol.parse(line);
            return Protocol.ok(SimpleJson.write(dispatch(request)));
        } catch (CommandException e) {
            return Protocol.error(e.getCode(), e.getMessage());
        } catch (RuntimeException e) {
            LOGGER.log(Level.SEVERE, "Unexpected failure", e);
            return Protocol.error("INTERNAL", "Internal server error");
        }
    }

    private Object dispatch(Request request) {
        return switch (request.command()) {
            case PING -> ping();
            case VALIDATE_ORDER -> orderValidator.validate(request.params());
        };
    }

    private Map<String, Object> ping() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ok");
        return result;
    }

    /** Nome do comando da linha recebida, para o log. */
    static String commandOf(String line) {
        int end = line.indexOf('|');
        String command = (end < 0 ? line : line.substring(0, end)).trim().toUpperCase();
        if (command.isEmpty()) {
            return "(vazio)";
        }
        return command.length() > 30 ? command.substring(0, 30) + "..." : command;
    }

    /** "OK" ou o código do erro da resposta, para o log. */
    static String resultOf(String response) {
        if (response.startsWith("OK|")) {
            return "OK";
        }
        String[] parts = response.split("\\|", 3);
        return parts.length > 1 ? parts[1] : response;
    }

    private static String readLine(Reader reader) throws IOException {
        StringBuilder line = new StringBuilder();
        int c;
        while ((c = reader.read()) != -1) {
            if (c == '\n') {
                break;
            }
            if (line.length() >= MAX_LINE_LENGTH) {
                throw new IOException("Request line too long");
            }
            line.append((char) c);
        }
        if (c == -1 && line.length() == 0) {
            return null;
        }
        int end = line.length();
        if (end > 0 && line.charAt(end - 1) == '\r') {
            line.setLength(end - 1);
        }
        return line.toString();
    }
}
