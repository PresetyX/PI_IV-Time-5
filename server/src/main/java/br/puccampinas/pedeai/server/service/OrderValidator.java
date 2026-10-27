package br.puccampinas.pedeai.server.service;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import br.puccampinas.pedeai.server.protocol.CommandException;
import br.puccampinas.pedeai.server.protocol.SimpleJson;

public class OrderValidator {

    public static final int MAX_ITEM_QUANTITY = 20;
    public static final int MAX_NOTE_LENGTH = 140;

    public Map<String, Object> validate(Map<String, String> params) {
        List<Map<String, Object>> items = parseItems(required(params, "items"));
        long totalCents = parseCents(required(params, "totalCents"), "totalCents");
        long computedCents = parseCents(required(params, "computedCents"), "computedCents");
        LocalTime openAt = parseTime(required(params, "openAt"), "openAt");
        LocalTime closeAt = parseTime(required(params, "closeAt"), "closeAt");
        LocalTime now = parseTime(required(params, "now"), "now");

        long itemsCents = 0;
        try {
            for (Map<String, Object> item : items) {
                itemsCents = Math.addExact(itemsCents, validateItem(item));
            }
        } catch (ArithmeticException e) {
            throw invalid("items amounts are out of range");
        }

        if (!isOpen(openAt, closeAt, now)) {
            throw new CommandException("CLOSED_HOURS", "Store is closed at " + now);
        }
        if (totalCents != computedCents || itemsCents != computedCents) {
            throw new CommandException("TOTAL_MISMATCH",
                    "Total " + totalCents + " does not match computed " + computedCents
                            + " (items sum " + itemsCents + ")");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("valid", true);
        result.put("totalCents", totalCents);
        return result;
    }

    private long validateItem(Map<String, Object> item) {
        long unitPriceCents = integer(item.get("unitPriceCents"), "unitPriceCents");
        long quantity = integer(item.get("quantity"), "quantity");
        if (unitPriceCents < 0) {
            throw invalid("unitPriceCents must not be negative");
        }
        if (quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
            throw invalid("quantity must be between 1 and " + MAX_ITEM_QUANTITY);
        }

        Object note = item.get("note");
        if (note != null) {
            if (!(note instanceof String text)) {
                throw invalid("note must be a string");
            }
            if (text.length() > MAX_NOTE_LENGTH) {
                throw invalid("note must have at most " + MAX_NOTE_LENGTH + " characters");
            }
        }

        long unitWithOptions = unitPriceCents;
        Object options = item.get("options");
        if (options != null) {
            if (!(options instanceof List<?> list)) {
                throw invalid("options must be an array");
            }
            for (Object option : list) {
                if (!(option instanceof Map<?, ?> map)) {
                    throw invalid("each option must be an object");
                }
                unitWithOptions = Math.addExact(unitWithOptions, integer(map.get("deltaCents"), "deltaCents"));
            }
        }
        return Math.multiplyExact(unitWithOptions, quantity);
    }

    private boolean isOpen(LocalTime openAt, LocalTime closeAt, LocalTime now) {
        if (openAt.isBefore(closeAt)) {
            return !now.isBefore(openAt) && now.isBefore(closeAt);
        }
        if (openAt.equals(closeAt)) {
            return false;
        }
        return !now.isBefore(openAt) || now.isBefore(closeAt);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseItems(String json) {
        Object parsed;
        try {
            parsed = SimpleJson.parse(json);
        } catch (IllegalArgumentException e) {
            throw invalid("items is not valid JSON: " + e.getMessage());
        }
        if (!(parsed instanceof List<?> list) || list.isEmpty()) {
            throw invalid("items must be a non-empty array");
        }
        for (Object item : list) {
            if (!(item instanceof Map<?, ?>)) {
                throw invalid("each item must be an object");
            }
        }
        return (List<Map<String, Object>>) parsed;
    }

    private long parseCents(String value, String name) {
        try {
            long cents = Long.parseLong(value.trim());
            if (cents < 0) {
                throw invalid(name + " must not be negative");
            }
            return cents;
        } catch (NumberFormatException e) {
            throw invalid(name + " must be an integer number of cents");
        }
    }

    private LocalTime parseTime(String value, String name) {
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw invalid(name + " must be a time in HH:mm format");
        }
    }

    private long integer(Object value, String name) {
        if (value instanceof Long number) {
            return number;
        }
        throw invalid(name + " must be an integer");
    }

    private String required(Map<String, String> params, String key) {
        String value = params.get(key);
        if (value == null || value.isBlank()) {
            throw invalid("Missing parameter: " + key);
        }
        return value;
    }

    private CommandException invalid(String message) {
        return new CommandException("INVALID_PARAMS", message);
    }
}
