package br.puccampinas.pedeai.store;

public record OpeningStatus(
        boolean open,
        boolean acceptingOrders,
        boolean paused,
        String closesAt,
        String lastOrderAt,
        NextOpening nextOpening) {

    public record NextOpening(int weekday, String opensAt, int daysFromToday) {
    }
}
