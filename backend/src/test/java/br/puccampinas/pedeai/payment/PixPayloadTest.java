/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Testes da montagem do Pix copia e cola. */
class PixPayloadTest {

    // O CRC de "123456789" bate com o valor de referência 29B1.
    @Test
    void crcMatchesTheCcittFalseCheckValue() {
        assertEquals("29B1", PixPayload.crc16("123456789"));
    }

    // O código traz chave, valor, nome, cidade, txid e termina com o CRC certo.
    @Test
    void buildsTheCodeWithKeyAmountNameCityAndCrc() {
        String payload = PixPayload.build("contato@triunfolanches.com", "Triunfo Lanches", "Campinas", 11440,
                "6aee7ff934aaec274db53f5d");

        assertTrue(payload.startsWith("000201"));
        assertTrue(payload.contains("0014br.gov.bcb.pix0126contato@triunfolanches.com"));
        assertTrue(payload.contains("53039865406114.40"));
        assertTrue(payload.contains("5915TRIUNFO LANCHES"));
        assertTrue(payload.contains("6008CAMPINAS"));
        assertTrue(payload.contains("62280524" + "6aee7ff934aaec274db53f5d"));
        String body = payload.substring(0, payload.length() - 4);
        assertTrue(body.endsWith("6304"));
        assertEquals(PixPayload.crc16(body), payload.substring(payload.length() - 4));
    }

    // Tira acentos e símbolos, corta no tamanho e usa o padrão quando fica vazio.
    @Test
    void removesAccentsAndCutsNameAndCity() {
        assertEquals("SAO JOSE DOS CAMP", PixPayload.clean("São José dos Campos!", 17, "X"));
        assertEquals("PEDE AI", PixPayload.clean("  ", 25, "PEDE AI"));
    }

    // Chave em branco ou valor zero são recusados.
    @Test
    void refusesMissingKeyOrZeroAmount() {
        assertThrows(IllegalArgumentException.class, () -> PixPayload.build(" ", "Loja", "Campinas", 100, "t"));
        assertThrows(IllegalArgumentException.class, () -> PixPayload.build("chave", "Loja", "Campinas", 0, "t"));
    }
}
