package br.puccampinas.pedeai.server.protocol;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SimpleJson {

    private SimpleJson() {
    }

    public static String write(Object value) {
        StringBuilder out = new StringBuilder();
        writeValue(out, value);
        return out.toString();
    }

    public static Object parse(String json) {
        Parser parser = new Parser(json);
        Object value = parser.readValue();
        parser.skipWhitespace();
        if (!parser.atEnd()) {
            throw parser.error("Unexpected trailing content");
        }
        return value;
    }

    private static void writeValue(StringBuilder out, Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof Map<?, ?> map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeString(out, String.valueOf(entry.getKey()));
                out.append(':');
                writeValue(out, entry.getValue());
            }
            out.append('}');
        } else if (value instanceof Iterable<?> items) {
            out.append('[');
            boolean first = true;
            for (Object item : items) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeValue(out, item);
            }
            out.append(']');
        } else if (value instanceof Boolean) {
            out.append(value);
        } else if (value instanceof Double || value instanceof Float) {
            double number = ((Number) value).doubleValue();
            out.append(Double.isFinite(number) ? value.toString() : "null");
        } else if (value instanceof Number) {
            out.append(value);
        } else {
            writeString(out, value.toString());
        }
    }

    private static void writeString(StringBuilder out, String text) {
        out.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        out.append('"');
    }

    private static final class Parser {

        private final String text;
        private int position;

        Parser(String text) {
            this.text = text;
        }

        boolean atEnd() {
            return position >= text.length();
        }

        void skipWhitespace() {
            while (!atEnd() && Character.isWhitespace(text.charAt(position))) {
                position++;
            }
        }

        IllegalArgumentException error(String message) {
            return new IllegalArgumentException(message + " at position " + position);
        }

        Object readValue() {
            skipWhitespace();
            if (atEnd()) {
                throw error("Unexpected end of input");
            }
            char c = text.charAt(position);
            return switch (c) {
                case '{' -> readObject();
                case '[' -> readArray();
                case '"' -> readString();
                case 't', 'f' -> readBoolean();
                case 'n' -> readNull();
                default -> readNumber();
            };
        }

        private Map<String, Object> readObject() {
            Map<String, Object> result = new LinkedHashMap<>();
            position++;
            skipWhitespace();
            if (peek() == '}') {
                position++;
                return result;
            }
            while (true) {
                skipWhitespace();
                if (peek() != '"') {
                    throw error("Expected string key");
                }
                String key = readString();
                skipWhitespace();
                expect(':');
                result.put(key, readValue());
                skipWhitespace();
                if (peek() == ',') {
                    position++;
                } else {
                    expect('}');
                    return result;
                }
            }
        }

        private List<Object> readArray() {
            List<Object> result = new ArrayList<>();
            position++;
            skipWhitespace();
            if (peek() == ']') {
                position++;
                return result;
            }
            while (true) {
                result.add(readValue());
                skipWhitespace();
                if (peek() == ',') {
                    position++;
                } else {
                    expect(']');
                    return result;
                }
            }
        }

        private String readString() {
            position++;
            StringBuilder out = new StringBuilder();
            while (true) {
                if (atEnd()) {
                    throw error("Unterminated string");
                }
                char c = text.charAt(position++);
                if (c == '"') {
                    return out.toString();
                }
                if (c != '\\') {
                    out.append(c);
                    continue;
                }
                if (atEnd()) {
                    throw error("Unterminated escape");
                }
                char escaped = text.charAt(position++);
                switch (escaped) {
                    case '"' -> out.append('"');
                    case '\\' -> out.append('\\');
                    case '/' -> out.append('/');
                    case 'b' -> out.append('\b');
                    case 'f' -> out.append('\f');
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case 'u' -> {
                        if (position + 4 > text.length()) {
                            throw error("Invalid unicode escape");
                        }
                        out.append((char) Integer.parseInt(text.substring(position, position + 4), 16));
                        position += 4;
                    }
                    default -> throw error("Invalid escape: \\" + escaped);
                }
            }
        }

        private Boolean readBoolean() {
            if (text.startsWith("true", position)) {
                position += 4;
                return Boolean.TRUE;
            }
            if (text.startsWith("false", position)) {
                position += 5;
                return Boolean.FALSE;
            }
            throw error("Invalid literal");
        }

        private Object readNull() {
            if (text.startsWith("null", position)) {
                position += 4;
                return null;
            }
            throw error("Invalid literal");
        }

        private Number readNumber() {
            int start = position;
            while (!atEnd() && "+-0123456789.eE".indexOf(text.charAt(position)) >= 0) {
                position++;
            }
            String token = text.substring(start, position);
            if (token.isEmpty()) {
                throw error("Unexpected character '" + text.charAt(position) + "'");
            }
            try {
                if (token.contains(".") || token.contains("e") || token.contains("E")) {
                    return Double.parseDouble(token);
                }
                return Long.parseLong(token);
            } catch (NumberFormatException e) {
                throw error("Invalid number: " + token);
            }
        }

        private char peek() {
            if (atEnd()) {
                throw error("Unexpected end of input");
            }
            return text.charAt(position);
        }

        private void expect(char expected) {
            if (peek() != expected) {
                throw error("Expected '" + expected + "'");
            }
            position++;
        }
    }
}
