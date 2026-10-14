package br.puccampinas.pedeai.common;

public class ServerUnavailableException extends RuntimeException {

    public ServerUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public ServerUnavailableException(String message) {
        super(message);
    }
}
