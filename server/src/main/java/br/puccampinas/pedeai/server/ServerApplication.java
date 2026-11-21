package br.puccampinas.pedeai.server;

import java.io.IOException;
import java.util.logging.Logger;

import br.puccampinas.pedeai.server.infra.Settings;
import br.puccampinas.pedeai.server.infra.SocketServer;
import br.puccampinas.pedeai.server.protocol.ConnectionHandler;
import br.puccampinas.pedeai.server.service.OrderValidator;

public class ServerApplication {

    // Log em uma linha ("20:30:15 INFO VALIDATE_ORDER de ... -> OK (3 ms)"). Precisa vir antes de qualquer Logger.
    static {
        if (System.getProperty("java.util.logging.SimpleFormatter.format") == null) {
            System.setProperty("java.util.logging.SimpleFormatter.format", "%1$tT %4$s %5$s%6$s%n");
        }
    }

    private static final Logger LOGGER = Logger.getLogger(ServerApplication.class.getName());

    public static void main(String[] args) throws IOException {
        Settings settings = Settings.fromEnvironment();
        OrderValidator orderValidator = new OrderValidator();

        SocketServer socketServer = new SocketServer(
                settings.socketPort(),
                socket -> new ConnectionHandler(socket, orderValidator));

        Runtime.getRuntime().addShutdownHook(new Thread(socketServer::stop));

        LOGGER.info("Listening on port " + settings.socketPort());
        socketServer.start();
    }
}
