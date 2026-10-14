package br.puccampinas.pedeai.server.protocol;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Protocol {

    private static final char SEPARATOR = '|';
    private static final char ESCAPE = '\\';

    private Protocol() {
    }

    public static Request parse(String line) {
        List<String> tokens = split(line);
        String name = tokens.get(0).trim();
        if (name.isEmpty()) {
            throw new CommandException("EMPTY_REQUEST", "Request line is empty");
        }

        Command command;
        try {
            command = Command.valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CommandException("UNKNOWN_COMMAND", "Unknown command: " + name);
        }

        Map<String, String> params = new LinkedHashMap<>();
        for (int i = 1; i < tokens.size(); i++) {
            String token = tokens.get(i);
            int equals = token.indexOf('=');
            if (equals <= 0) {
                throw new CommandException("INVALID_PARAM", "Parameter must be key=value: " + token);
            }
            params.put(token.substring(0, equals), token.substring(equals + 1));
        }
        return new Request(command, params);
    }

    public static String ok(String json) {
        return "OK" + SEPARATOR + json;
    }

    public static String error(String code, String message) {
        String singleLine = message == null ? "" : message.replace('\r', ' ').replace('\n', ' ');
        return "ERROR" + SEPARATOR + code + SEPARATOR + singleLine;
    }

    private static List<String> split(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == ESCAPE && i + 1 < line.length()) {
                char next = line.charAt(++i);
                switch (next) {
                    case 'n' -> current.append('\n');
                    case 'r' -> current.append('\r');
                    default -> current.append(next);
                }
            } else if (c == SEPARATOR) {
                tokens.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        tokens.add(current.toString());
        return tokens;
    }
}
