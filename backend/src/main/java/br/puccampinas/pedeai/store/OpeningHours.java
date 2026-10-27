package br.puccampinas.pedeai.store;

public record OpeningHours(int weekday, String opensAt, String closesAt, String lastOrderAt) {
}
