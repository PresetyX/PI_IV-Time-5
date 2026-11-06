package br.puccampinas.pedeai.store;

public record OpeningStatus(
        boolean open,
        boolean acceptingOrders,
        boolean paused,
        String closesAt,
        String lastOrderAt,
        NextOpening nextOpening,
        String opensAt) {

    public OpeningStatus(boolean open, boolean acceptingOrders, boolean paused, String closesAt, String lastOrderAt,
            NextOpening nextOpening) {
        this(open, acceptingOrders, paused, closesAt, lastOrderAt, nextOpening, null);
    }

    public record NextOpening(int weekday, String opensAt, int daysFromToday) {
    }
}
