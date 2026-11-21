/*
 * Autor: Mateus Souza Marinho
 * RA: 24005497
 */
package br.puccampinas.pedeai.socket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class OrderValidationClientTest {

    private final SocketClient socketClient = mock(SocketClient.class);
    private final OrderValidationClient client = new OrderValidationClient(socketClient);

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
    void noteIsEscapedTheWayTheServerReadsIt() {
        String json = OrderValidationClient.itemsJson(List.of(
                new OrderValidationClient.Item(500, 1, "sem \"cebola\"\nbem passado \\ ok\t" + (char) 1, List.of())));

        assertEquals("[{\"unitPriceCents\":500,\"quantity\":1,"
                + "\"note\":\"sem \\\"cebola\\\"\\nbem passado \\\\ ok\\t\\u0001\",\"options\":[]}]", json);
    }

    @Test
    void validOrderPasses() {
        respond(new SocketResponse(true, "{\"valid\":true,\"totalCents\":5400}", null, null));

        OrderValidationClient.Result result = client.validate(order);

        assertTrue(result.valid());
        verify(socketClient).send(eq("VALIDATE_ORDER"), anyMap());
    }

    @Test
    void totalMismatchIsPriceChanged() {
        respond(new SocketResponse(false, null, "TOTAL_MISMATCH", "Total 5000 does not match computed 5400"));

        assertStatus(OrderValidationClient.Status.PRICE_CHANGED);
    }

    @Test
    void closedHoursIsClosedHours() {
        respond(new SocketResponse(false, null, "CLOSED_HOURS", "Store is closed at 23:10"));

        assertStatus(OrderValidationClient.Status.CLOSED_HOURS);
    }

    @Test
    void invalidParamsIsInvalidWithTheServerMessage() {
        respond(new SocketResponse(false, null, "INVALID_PARAMS", "quantity must be between 1 and 20"));

        OrderValidationClient.Result result = client.validate(order);

        assertEquals(OrderValidationClient.Status.INVALID, result.status());
        assertEquals("quantity must be between 1 and 20", result.detail());
    }

    @Test
    void timeoutOrUnreachableServerIsUnavailable() {
        when(socketClient.send(eq("VALIDATE_ORDER"), anyMap()))
                .thenThrow(new SocketUnavailableException("Server did not respond within 3000 ms"));

        assertStatus(OrderValidationClient.Status.UNAVAILABLE);
    }

    @Test
    void unexpectedServerErrorIsUnavailable() {
        respond(new SocketResponse(false, null, "INTERNAL", "Internal server error"));

        assertStatus(OrderValidationClient.Status.UNAVAILABLE);
    }

    @Test
    void okWithoutValidTrueIsNeverAccepted() {
        respond(new SocketResponse(true, "{\"status\":\"ok\"}", null, null));

        assertStatus(OrderValidationClient.Status.UNAVAILABLE);
    }

    private void respond(SocketResponse response) {
        when(socketClient.send(eq("VALIDATE_ORDER"), anyMap())).thenReturn(response);
    }

    private void assertStatus(OrderValidationClient.Status status) {
        assertEquals(status, client.validate(order).status());
    }
}
