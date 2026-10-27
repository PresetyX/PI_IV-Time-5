package br.puccampinas.pedeai.store;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

class OpeningStatusCalculatorTest {

    private static final List<OpeningHours> HOURS = List.of(
            new OpeningHours(2, "18:00", "23:30", "23:00"),
            new OpeningHours(5, "18:00", "01:00", "00:30"),
            new OpeningHours(6, "18:00", "01:00", "00:30"),
            new OpeningHours(0, "12:00", "20:00", null));

    @Test
    void openDuringTheEveningAndAcceptingOrders() {
        OpeningStatus status = calculateAt("2026-10-27T20:00", HOURS, null);

        assertTrue(status.open());
        assertTrue(status.acceptingOrders());
        assertEquals("23:30", status.closesAt());
        assertEquals("23:00", status.lastOrderAt());
    }

    @Test
    void openButKitchenStoppedAfterLastOrder() {
        OpeningStatus status = calculateAt("2026-10-27T23:10", HOURS, null);

        assertTrue(status.open());
        assertFalse(status.acceptingOrders());
    }

    @Test
    void beforeOpeningPointsToLaterToday() {
        OpeningStatus status = calculateAt("2026-10-27T10:00", HOURS, null);

        assertFalse(status.open());
        assertEquals(2, status.nextOpening().weekday());
        assertEquals("18:00", status.nextOpening().opensAt());
        assertEquals(0, status.nextOpening().daysFromToday());
    }

    @Test
    void afterMidnightStillInsideFridayWindow() {
        OpeningStatus status = calculateAt("2026-10-31T00:20", HOURS, null);

        assertTrue(status.open());
        assertTrue(status.acceptingOrders());
        assertEquals("01:00", status.closesAt());
    }

    @Test
    void afterMidnightPastLastOrderOfFriday() {
        OpeningStatus status = calculateAt("2026-10-31T00:45", HOURS, null);

        assertTrue(status.open());
        assertFalse(status.acceptingOrders());
    }

    @Test
    void closedDayPointsToNextDayWithHours() {
        OpeningStatus status = calculateAt("2026-10-26T15:00", HOURS, null);

        assertFalse(status.open());
        assertEquals(2, status.nextOpening().weekday());
        assertEquals(1, status.nextOpening().daysFromToday());
    }

    @Test
    void pausedStoreDoesNotAcceptOrders() {
        Instant pausedUntil = LocalDateTime.parse("2026-10-27T21:00")
                .atZone(OpeningStatusCalculator.STORE_ZONE).toInstant();

        OpeningStatus status = calculateAt("2026-10-27T20:00", HOURS, pausedUntil);

        assertTrue(status.open());
        assertTrue(status.paused());
        assertFalse(status.acceptingOrders());
    }

    @Test
    void storeWithoutHoursIsClosedWithoutNextOpening() {
        OpeningStatus status = calculateAt("2026-10-27T20:00", List.of(), null);

        assertFalse(status.open());
        assertNull(status.nextOpening());
    }

    private OpeningStatus calculateAt(String localDateTime, List<OpeningHours> hours, Instant pausedUntil) {
        Instant now = LocalDateTime.parse(localDateTime).atZone(OpeningStatusCalculator.STORE_ZONE).toInstant();
        Clock clock = Clock.fixed(now, OpeningStatusCalculator.STORE_ZONE);
        Store store = new Store(new ObjectId(), "demo", "Demo", null, null, null, null, null, "#D62F1F", null, hours,
                List.of("TABLE"), 1000, 500, null, pausedUntil, null, false, true, null, null);
        return new OpeningStatusCalculator(clock).calculate(store);
    }
}
