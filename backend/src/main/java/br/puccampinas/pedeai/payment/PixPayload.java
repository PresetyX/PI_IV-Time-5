/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.payment;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

/**
 * Monta o Pix copia e cola no padrão BR Code do Banco Central.
 * Cada campo é ID + tamanho com 2 dígitos + valor.
 */
public final class PixPayload {

    static final int MAX_NAME = 25;
    static final int MAX_CITY = 15;
    static final int MAX_TXID = 25;
    static final int MAX_KEY = 77;

    private PixPayload() {
    }

    /** Gera o texto copia e cola. Exige chave de até 77 caracteres e valor maior que zero. */
    public static String build(String pixKey, String merchantName, String city, int amountCents, String txid) {
        if (pixKey == null || pixKey.isBlank() || pixKey.trim().length() > MAX_KEY) {
            throw new IllegalArgumentException("pixKey is required and has at most " + MAX_KEY + " characters");
        }
        if (amountCents <= 0) {
            throw new IllegalArgumentException("amountCents must be positive");
        }
        // Dados da conta: 00 = GUI do Pix (br.gov.bcb.pix) e 01 = chave Pix.
        String account = field("00", "br.gov.bcb.pix") + field("01", pixKey.trim());
        // 00 = versão do payload.
        String payload = field("00", "01")
                // 26 = conta do recebedor (GUI e chave).
                + field("26", account)
                // 52 = categoria do comerciante (0000 = não informada).
                + field("52", "0000")
                // 53 = moeda (986 = real).
                + field("53", "986")
                // 54 = valor em reais com ponto e duas casas.
                + field("54", String.format(Locale.ROOT, "%d.%02d", amountCents / 100, amountCents % 100))
                // 58 = país.
                + field("58", "BR")
                // 59 = nome do recebedor, até 25 caracteres.
                + field("59", clean(merchantName, MAX_NAME, "PEDE AI"))
                // 60 = cidade do recebedor, até 15 caracteres.
                + field("60", clean(city, MAX_CITY, "BRASIL"))
                // 62 = dados adicionais; o subcampo 05 leva o txid.
                + field("62", field("05", txid(txid)))
                // 63 = CRC; "6304" entra no cálculo e os 4 dígitos vão no final.
                + "6304";
        return payload + crc16(payload);
    }

    /** Monta um campo no formato ID + tamanho (2 dígitos) + valor; o valor tem no máximo 99 caracteres. */
    static String field(String id, String value) {
        if (value.length() > 99) {
            throw new IllegalArgumentException("Field " + id + " is longer than 99 characters");
        }
        return id + String.format(Locale.ROOT, "%02d", value.length()) + value;
    }

    /**
     * Tira acentos e símbolos, passa para maiúsculas e corta no tamanho máximo.
     * Se sobrar texto vazio, usa o valor padrão.
     */
    static String clean(String value, int max, String fallback) {
        String plain = value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9 ]", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
        if (plain.isEmpty()) {
            plain = fallback;
        }
        return plain.length() > max ? plain.substring(0, max).trim() : plain;
    }

    /**
     * Deixa só letras e números e mantém os últimos 25 caracteres.
     * Sem txid usa "***".
     */
    static String txid(String value) {
        String plain = value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "");
        if (plain.isEmpty()) {
            return "***";
        }
        return plain.length() > MAX_TXID ? plain.substring(plain.length() - MAX_TXID) : plain;
    }

    /** CRC16 CCITT (polinômio 0x1021, início 0xFFFF) em 4 dígitos hexadecimais maiúsculos. */
    static String crc16(String value) {
        int crc = 0xFFFF;
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return String.format(Locale.ROOT, "%04X", crc);
    }
}
