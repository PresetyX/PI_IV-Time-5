package br.puccampinas.pedeai.server.protocol;

import java.util.Map;

public record Request(Command command, Map<String, String> params) {

    public String require(String key) {
        String value = params.get(key);
        if (value == null || value.isEmpty()) {
            throw new CommandException("MISSING_PARAM", "Missing required parameter: " + key);
        }
        return value;
    }
}
