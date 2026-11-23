/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.server.infra;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SocketServer - particionamento por estados (NOVO, EXECUTANDO, PARADO)")
class SocketServerTest {

    private final AtomicInteger handled = new AtomicInteger();
    private int port;
    private SocketServer server;

    private static int freePort() throws IOException {
        try (ServerSocket probe = new ServerSocket(0)) {
            return probe.getLocalPort();
        }
    }

    private SocketServer newServer() throws IOException {
        port = freePort();
        return new SocketServer(port, socket -> () -> {
            handled.incrementAndGet();
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        });
    }

    private CompletableFuture<Void> startInBackground(SocketServer target) {
        return CompletableFuture.runAsync(() -> {
            try {
                target.start();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }

    private boolean canConnect() {
        try (Socket ignored = new Socket("localhost", port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void waitUntilAccepting() throws InterruptedException {
        for (int i = 0; i < 100 && !canConnect(); i++) {
            Thread.sleep(20);
        }
    }

    private void waitForHandled(int expected) throws InterruptedException {
        for (int i = 0; i < 100 && handled.get() < expected; i++) {
            Thread.sleep(20);
        }
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop();
        }
    }

    @Test
    @DisplayName("NOVO: ainda não abre a porta")
    void newServerDoesNotListen() throws IOException {
        server = newServer();
        assertEquals(false, canConnect());
    }

    @Test
    @DisplayName("NOVO -> stop() -> PARADO: parar sem ter iniciado não lança erro")
    void stopBeforeStart() throws IOException {
        server = newServer();
        assertDoesNotThrow(server::stop);
    }

    @Test
    @DisplayName("NOVO -> start() -> EXECUTANDO: aceita conexões e entrega cada uma ao handler")
    void startAcceptsConnections() throws Exception {
        server = newServer();
        startInBackground(server);
        waitUntilAccepting();
        waitForHandled(1);
        int before = handled.get();

        new Socket("localhost", port).close();
        new Socket("localhost", port).close();
        waitForHandled(before + 2);

        assertEquals(before + 2, handled.get());
    }

    @Test
    @DisplayName("EXECUTANDO -> start() de novo na mesma porta: lança IOException e o primeiro continua")
    void secondStartOnSamePortFails() throws Exception {
        server = newServer();
        startInBackground(server);
        waitUntilAccepting();

        SocketServer twin = new SocketServer(port, socket -> () -> { });
        assertThrows(IOException.class, twin::start);
        twin.stop();
        assertTrue(canConnect());
    }

    @Test
    @DisplayName("EXECUTANDO -> stop() -> PARADO: start() termina e a porta fecha")
    void stopEndsStartLoop() throws Exception {
        server = newServer();
        CompletableFuture<Void> running = startInBackground(server);
        waitUntilAccepting();
        waitForHandled(1);

        server.stop();

        assertDoesNotThrow(() -> running.get(2, TimeUnit.SECONDS));
        assertEquals(false, canConnect());
    }

    @Test
    @DisplayName("PARADO -> start(): anomalia, o pool já foi encerrado e a primeira conexão derruba o start()")
    void restartAfterStopFails() throws Exception {
        server = newServer();
        CompletableFuture<Void> first = startInBackground(server);
        waitUntilAccepting();
        waitForHandled(1);
        server.stop();
        first.get(2, TimeUnit.SECONDS);

        CountDownLatch done = new CountDownLatch(1);
        CompletableFuture<Void> second = startInBackground(server).whenComplete((v, e) -> done.countDown());
        waitUntilAccepting();
        new Socket("localhost", port).close();
        done.await(2, TimeUnit.SECONDS);

        ExecutionException failure = assertThrows(ExecutionException.class, second::get);
        assertInstanceOf(RejectedExecutionException.class, failure.getCause());
    }
}
