package br.puccampinas.pedeai.server.protocol;

public enum Command {
    PING(true),
    TENANT_GET(true),
    MENU_LIST(true),
    PRODUCT_UPSERT(false),
    TABLE_LIST(false),
    BILL_OPEN(false),
    BILL_GET(false),
    BILL_LIST(false),
    BILL_CLOSE(false),
    ORDER_CREATE(false),
    ORDER_QUEUE(false),
    ORDER_STATUS(false),
    TICKET_NEXT(false),
    REPORT_SUMMARY(false),
    USER_BY_EMAIL(false);

    private final boolean implemented;

    Command(boolean implemented) {
        this.implemented = implemented;
    }

    public boolean isImplemented() {
        return implemented;
    }
}
