package br.puccampinas.pedeai.server;

import java.io.IOException;
import java.util.logging.Logger;

import br.puccampinas.pedeai.server.infra.Settings;
import br.puccampinas.pedeai.server.infra.SocketServer;
import br.puccampinas.pedeai.server.protocol.ConnectionHandler;
import br.puccampinas.pedeai.server.service.OrderValidator;

public class ServerApplication {

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
