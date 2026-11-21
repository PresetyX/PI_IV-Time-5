/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.socket;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

/**
 * Guarda da regra da disciplina: a comunicação por socket não pode depender do Spring. Os arquivos do pacote
 * {@code socket} só podem importar o próprio Java ({@code java.*}) e o próprio pacote. A ponte com o Spring fica em
 * {@code config/SocketConfig}.
 */
class SocketPackageIsPureJavaTest {

    private static final Path SOCKET_SOURCES = Path.of("src/main/java/br/puccampinas/pedeai/socket");

    @Test
    void socketPackageImportsOnlyJava() throws IOException {
        List<String> violations = new ArrayList<>();
        List<Path> files;
        try (Stream<Path> stream = Files.list(SOCKET_SOURCES)) {
            files = stream.filter(path -> path.toString().endsWith(".java")).toList();
        }
        assertFalse(files.isEmpty(), "Nenhum arquivo em " + SOCKET_SOURCES.toAbsolutePath());

        for (Path file : files) {
            for (String line : Files.readAllLines(file)) {
                String code = line.trim();
                if (code.startsWith("import ") && !code.startsWith("import java.")
                        && !code.startsWith("import static java.")) {
                    violations.add(file.getFileName() + ": " + code);
                }
                if (code.startsWith("@") && !code.startsWith("@Override") && !code.startsWith("@FunctionalInterface")) {
                    violations.add(file.getFileName() + ": anotação " + code);
                }
            }
        }
        assertTrue(violations.isEmpty(), "O pacote socket precisa ser Java puro (sem Spring/Jackson):\n"
                + String.join("\n", violations));
    }
}
