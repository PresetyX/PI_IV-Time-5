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

import com.mongodb.MongoException;

import br.puccampinas.pedeai.server.infra.MongoConnection;
import br.puccampinas.pedeai.server.service.MenuService;
import br.puccampinas.pedeai.server.service.TenantService;

public class ConnectionHandler implements Runnable {

    private static final Logger LOGGER = Logger.getLogger(ConnectionHandler.class.getName());
    private static final int READ_TIMEOUT_MILLIS = 10_000;
    private static final int MAX_LINE_LENGTH = 8192;

    private final Socket socket;
    private final MongoConnection mongo;
    private final TenantService tenantService;
    private final MenuService menuService;

    public ConnectionHandler(Socket socket, MongoConnection mongo, TenantService tenantService,
            MenuService menuService) {
        this.socket = socket;
        this.mongo = mongo;
        this.tenantService = tenantService;
        this.menuService = menuService;
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
            writer.write(process(line));
            writer.write('\n');
            writer.flush();
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
        } catch (MongoException e) {
            LOGGER.log(Level.WARNING, "Database failure", e);
            return Protocol.error("DATABASE_UNAVAILABLE", "Database is not available");
        } catch (RuntimeException e) {
            LOGGER.log(Level.SEVERE, "Unexpected failure", e);
            return Protocol.error("INTERNAL", "Internal server error");
        }
    }

    private Object dispatch(Request request) {
        Command command = request.command();
        if (!command.isImplemented()) {
            throw new CommandException("NOT_IMPLEMENTED", "Command not implemented: " + command);
        }
        return switch (command) {
            case PING -> ping();
            case TENANT_GET -> tenantService.getBySlug(request.require("slug"));
            case MENU_LIST -> menuService.list(request.require("tenant"));
            default -> throw new CommandException("NOT_IMPLEMENTED", "Command not implemented: " + command);
        };
    }

    private Map<String, Object> ping() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ok");
        result.put("database", mongo.isConnected() ? "connected" : "disconnected");
        return result;
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
