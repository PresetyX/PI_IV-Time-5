package br.puccampinas.pedeai.server.infra;

public record Settings(String mongodbUri, int socketPort) {

    private static final String DEFAULT_MONGODB_URI = "mongodb://localhost:27017";
    private static final int DEFAULT_SOCKET_PORT = 5000;

    public static Settings fromEnvironment() {
        String uri = valueOrDefault(System.getenv("MONGODB_URI"), DEFAULT_MONGODB_URI);
        String port = System.getenv("SOCKET_PORT");
        int socketPort = DEFAULT_SOCKET_PORT;
        if (port != null && !port.isBlank()) {
            try {
                socketPort = Integer.parseInt(port.trim());
            } catch (NumberFormatException e) {
                throw new IllegalStateException("SOCKET_PORT must be an integer: " + port, e);
            }
        }
        return new Settings(uri, socketPort);
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
