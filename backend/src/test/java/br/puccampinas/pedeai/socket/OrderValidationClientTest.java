package br.puccampinas.pedeai.socket;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.OrderRejectedException;
import br.puccampinas.pedeai.common.ServerUnavailableException;

class OrderValidationClientTest {

    private final SocketClient socketClient = mock(SocketClient.class);
    private final OrderValidationClient client = new OrderValidationClient(socketClient, new ObjectMapper());

    private final OrderValidationClient.OrderValidation order = new OrderValidationClient.OrderValidation(
            List.of(new OrderValidationClient.Item(3200, 1, "sem cebola", List.of(600)),
                    new OrderValidationClient.Item(800, 2, "", List.of())),
            5400, 5400, "17:00", "23:00", LocalTime.of(20, 30, 45));

    @Test
    void sendsTheProtocolParameters() {
        Map<String, String> params = client.params(order);

        assertEquals("[{\"unitPriceCents\":3200,\"quantity\":1,\"note\":\"sem cebola\",\"options\":[{\"deltaCents\":600}]},"
                + "{\"unitPriceCents\":800,\"quantity\":2,\"options\":[]}]", params.get("items"));
        assertEquals("5400", params.get("totalCents"));
        assertEquals("5400", params.get("computedCents"));
        assertEquals("17:00", params.get("openAt"));
        assertEquals("23:00", params.get("closeAt"));
        assertEquals("20:30", params.get("now"));
    }

    @Test
    void validOrderPasses() {
        respond(new SocketResponse(true, "{\"valid\":true,\"totalCents\":5400}", null, null));

        assertDoesNotThrow(() -> client.validate(order));
        verify(socketClient).send(eq("VALIDATE_ORDER"), anyMap());
    }

    @Test
    void totalMismatchIsPriceChanged() {
        respond(new SocketResponse(false, null, "TOTAL_MISMATCH", "Total 5000 does not match computed 5400"));

        assertRejected(HttpStatus.CONFLICT, OrderRejectedException.PRICE_CHANGED);
    }

    @Test
    void closedHoursIsStoreClosed() {
        respond(new SocketResponse(false, null, "CLOSED_HOURS", "Store is closed at 23:10"));

        assertRejected(HttpStatus.CONFLICT, OrderRejectedException.STORE_CLOSED);
    }

    @Test
    void invalidParamsIsBadRequest() {
        respond(new SocketResponse(false, null, "INVALID_PARAMS", "quantity must be between 1 and 20"));

        assertThrows(InvalidRequestException.class, () -> client.validate(order));
    }

    @Test
    void timeoutOrUnreachableServerIsUnavailable() {
        when(socketClient.send(eq("VALIDATE_ORDER"), anyMap()))
                .thenThrow(new ServerUnavailableException("Server did not respond within 3000 ms"));

        assertRejected(HttpStatus.SERVICE_UNAVAILABLE, OrderRejectedException.VALIDATION_UNAVAILABLE);
    }

    @Test
    void unexpectedServerErrorIsUnavailable() {
        respond(new SocketResponse(false, null, "INTERNAL", "Internal server error"));

        assertRejected(HttpStatus.SERVICE_UNAVAILABLE, OrderRejectedException.VALIDATION_UNAVAILABLE);
    }

    @Test
    void okWithoutValidTrueIsNeverAccepted() {
        respond(new SocketResponse(true, "{\"status\":\"ok\"}", null, null));

        assertRejected(HttpStatus.SERVICE_UNAVAILABLE, OrderRejectedException.VALIDATION_UNAVAILABLE);
    }

    private void respond(SocketResponse response) {
        when(socketClient.send(eq("VALIDATE_ORDER"), anyMap())).thenReturn(response);
    }

    private void assertRejected(HttpStatus status, String code) {
        OrderRejectedException e = assertThrows(OrderRejectedException.class, () -> client.validate(order));
        assertEquals(status, e.getStatus());
        assertEquals(code, e.getCode());
    }
}
