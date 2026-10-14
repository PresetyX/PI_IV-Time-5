package br.puccampinas.pedeai.common;

import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return response(HttpStatus.BAD_REQUEST, "validation", message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException e) {
        return response(HttpStatus.BAD_REQUEST, "validation", "Request body is invalid or missing");
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e) {
        return response(HttpStatus.NOT_FOUND, "not_found", e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException e) {
        return response(HttpStatus.CONFLICT, "conflict", e.getMessage());
    }

    @ExceptionHandler(ServerUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleServerUnavailable(ServerUnavailableException e) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "server_unavailable", e.getMessage());
    }

    @ExceptionHandler(UpstreamErrorException.class)
    public ResponseEntity<ErrorResponse> handleUpstreamError(UpstreamErrorException e) {
        return response(HttpStatus.BAD_GATEWAY, "upstream_error", e.getMessage());
    }

    private ResponseEntity<ErrorResponse> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message));
    }
}
