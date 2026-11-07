package br.puccampinas.pedeai.payment;

public record PixResponse(String tabId, String storeName, int amountCents, String payload) {
}
