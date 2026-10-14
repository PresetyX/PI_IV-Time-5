package br.puccampinas.pedeai.common;

public class UpstreamErrorException extends RuntimeException {

    private final String code;

    public UpstreamErrorException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
