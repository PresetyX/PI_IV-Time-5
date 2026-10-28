package br.puccampinas.pedeai.order;

import org.springframework.http.HttpStatus;

/**
 * Pedido recusado antes de gravar. Cada código vira uma tela do fluxo (item esgotado, recusa na validação,
 * confirmação de idade), então o {@code message} já vem em português, pronto para exibir.
 */
public class OrderRejectedException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public OrderRejectedException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
