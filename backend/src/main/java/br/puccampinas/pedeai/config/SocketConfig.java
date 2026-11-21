/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import br.puccampinas.pedeai.socket.OrderValidationClient;
import br.puccampinas.pedeai.socket.SocketClient;

/**
 * Única ponte entre o Spring e o cliente do socket. O pacote {@code socket} é Java puro (sem Spring): aqui só
 * se criam os objetos com {@code SOCKET_HOST} e {@code SOCKET_PORT} para o resto do backend usar.
 */
@Configuration
public class SocketConfig {

    @Bean
    public SocketClient socketClient(@Value("${socket.host}") String host, @Value("${socket.port}") int port) {
        return new SocketClient(host, port);
    }

    @Bean
    public OrderValidationClient orderValidationClient(SocketClient socketClient) {
        return new OrderValidationClient(socketClient);
    }
}
