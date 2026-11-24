/*
 * Autor: Pedro Henrique Medeiros dos Reis
 * RA: 24801656
 */
package br.puccampinas.pedeai.common;

public class ServerUnavailableException extends RuntimeException {

    public ServerUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public ServerUnavailableException(String message) {
        super(message);
    }
}
