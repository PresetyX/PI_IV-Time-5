package br.puccampinas.pedeai.server.infra;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;

public class SocketServer {

    private static final Logger LOGGER = Logger.getLogger(SocketServer.class.getName());
    private static final int POOL_SIZE = 16;

    private final int port;
    private final Function<Socket, Runnable> handlerFactory;
    private final ExecutorService executor = Executors.newFixedThreadPool(POOL_SIZE);

    private volatile ServerSocket serverSocket;
    private volatile boolean running;

    public SocketServer(int port, Function<Socket, Runnable> handlerFactory) {
        this.port = port;
        this.handlerFactory = handlerFactory;
    }

    public void start() throws IOException {
        serverSocket = new ServerSocket(port);
        running = true;
        while (running) {
            try {
                Socket client = serverSocket.accept();
                executor.execute(handlerFactory.apply(client));
            } catch (IOException e) {
                if (running) {
                    LOGGER.log(Level.WARNING, "Failed to accept connection", e);
                }
            }
        }
    }

    public void stop() {
        running = false;
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException e) {
            LOGGER.log(Level.WARNING, "Failed to close server socket", e);
        }
        executor.shutdown();
    }
}
