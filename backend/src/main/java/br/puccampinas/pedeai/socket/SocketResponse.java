package br.puccampinas.pedeai.socket;

/**
 * Resposta de uma linha do {@code server/}: {@code OK|json} ou {@code ERROR|codigo|mensagem}.
 */
public record SocketResponse(boolean ok, String body, String code, String message) {

    private static final String OK_PREFIX = "OK|";
    private static final String ERROR_PREFIX = "ERROR|";

    public static SocketResponse parse(String line) {
        if (line.startsWith(OK_PREFIX)) {
            return new SocketResponse(true, line.substring(OK_PREFIX.length()), null, null);
        }
        if (line.startsWith(ERROR_PREFIX)) {
            String[] parts = line.substring(ERROR_PREFIX.length()).split("\\|", 2);
            String code = parts[0];
            String message = parts.length > 1 ? parts[1] : "";
            return new SocketResponse(false, null, code, message);
        }
        throw new SocketUnavailableException("Malformed response from server");
    }
}
