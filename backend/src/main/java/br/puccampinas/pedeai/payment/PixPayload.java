package br.puccampinas.pedeai.payment;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

public final class PixPayload {

    static final int MAX_NAME = 25;
    static final int MAX_CITY = 15;
    static final int MAX_TXID = 25;
    static final int MAX_KEY = 77;

    private PixPayload() {
    }

    public static String build(String pixKey, String merchantName, String city, int amountCents, String txid) {
        if (pixKey == null || pixKey.isBlank() || pixKey.trim().length() > MAX_KEY) {
            throw new IllegalArgumentException("pixKey is required and has at most " + MAX_KEY + " characters");
        }
        if (amountCents <= 0) {
            throw new IllegalArgumentException("amountCents must be positive");
        }
        String account = field("00", "br.gov.bcb.pix") + field("01", pixKey.trim());
        String payload = field("00", "01")
                + field("26", account)
                + field("52", "0000")
                + field("53", "986")
                + field("54", String.format(Locale.ROOT, "%d.%02d", amountCents / 100, amountCents % 100))
                + field("58", "BR")
                + field("59", clean(merchantName, MAX_NAME, "PEDE AI"))
                + field("60", clean(city, MAX_CITY, "BRASIL"))
                + field("62", field("05", txid(txid)))
                + "6304";
        return payload + crc16(payload);
    }

    static String field(String id, String value) {
        if (value.length() > 99) {
            throw new IllegalArgumentException("Field " + id + " is longer than 99 characters");
        }
        return id + String.format(Locale.ROOT, "%02d", value.length()) + value;
    }

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

    static String txid(String value) {
        String plain = value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "");
        if (plain.isEmpty()) {
            return "***";
        }
        return plain.length() > MAX_TXID ? plain.substring(plain.length() - MAX_TXID) : plain;
    }

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
