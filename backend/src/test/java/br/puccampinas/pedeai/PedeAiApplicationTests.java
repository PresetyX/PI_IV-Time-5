package br.puccampinas.pedeai;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;

class PedeAiApplicationTests {

    @Test
    void classePrincipalPodeSerInstanciada() {
        assertNotNull(new PedeAiApplication());
    }
}
