package br.puccampinas.pedeai.server.protocol;

public class CommandException extends RuntimeException {

    private final String code;

    public CommandException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
