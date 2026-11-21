/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.socket;

/**
 * O {@code server/} não respondeu: fora do ar, sem resposta no prazo ou resposta fora do protocolo.
 * Java puro, sem dependência do backend: quem usa o cliente traduz para a resposta HTTP.
 */
public class SocketUnavailableException extends RuntimeException {

    public SocketUnavailableException(String message) {
        super(message);
    }

    public SocketUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
