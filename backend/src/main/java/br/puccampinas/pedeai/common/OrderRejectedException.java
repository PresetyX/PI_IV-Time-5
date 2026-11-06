package br.puccampinas.pedeai.common;

import org.springframework.http.HttpStatus;

/**
 * Pedido recusado antes de ser gravado. O {@code code} vai no campo {@code error} da resposta para o front
 * saber qual tela mostrar.
 */
public class OrderRejectedException extends RuntimeException {

    public static final String PRICE_CHANGED = "price_changed";
    public static final String STORE_CLOSED = "store_closed";
    public static final String VALIDATION_UNAVAILABLE = "validation_unavailable";
    public static final String AGE_CONFIRMATION_REQUIRED = "age_confirmation_required";
    public static final String ITEM_UNAVAILABLE = "item_unavailable";

    private final HttpStatus status;
    private final String code;

    public OrderRejectedException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public OrderRejectedException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
