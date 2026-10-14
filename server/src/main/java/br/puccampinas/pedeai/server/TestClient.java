package br.puccampinas.pedeai.server;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class TestClient {

    private static final int TIMEOUT_MILLIS = 5000;

    public static void main(String[] args) throws IOException {
        String host = valueOrDefault(System.getenv("SOCKET_HOST"), "localhost");
        int port = Integer.parseInt(valueOrDefault(System.getenv("SOCKET_PORT"), "5000"));

        if (args.length > 0) {
            System.out.println(send(host, port, String.join(" ", args)));
            return;
        }

        System.out.println("Target " + host + ":" + port + ". One request per line, empty line to exit.");
        BufferedReader console = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        while (true) {
            System.out.print("> ");
            String line = console.readLine();
            if (line == null || line.isBlank()) {
                return;
            }
            try {
                System.out.println(send(host, port, line));
            } catch (IOException e) {
                System.out.println("Connection failed: " + e.getMessage());
            }
        }
    }

    private static String send(String host, int port, String line) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MILLIS);
            socket.setSoTimeout(TIMEOUT_MILLIS);
            Writer writer = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);
            writer.write(line);
            writer.write('\n');
            writer.flush();
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String response = reader.readLine();
            return response == null ? "(connection closed without response)" : response;
        }
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
