package br.puccampinas.pedeai.store;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

@Component
public class OpeningStatusCalculator {

    public static final ZoneId STORE_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final int DAYS_IN_WEEK = 7;

    private final Clock clock;

    public OpeningStatusCalculator(Clock clock) {
        this.clock = clock;
    }

    public OpeningStatus calculate(Store store) {
        LocalDateTime now = LocalDateTime.ofInstant(clock.instant(), STORE_ZONE);
        List<OpeningHours> hours = store.openingHours() == null ? List.of() : store.openingHours();
        boolean paused = store.pausedUntil() != null && store.pausedUntil().isAfter(clock.instant());

        Optional<Window> current = currentWindow(hours, now);
        if (current.isPresent()) {
            Window window = current.get();
            boolean accepting = !paused && now.isBefore(window.lastOrder());
            return new OpeningStatus(true, accepting, paused, window.closesAt(), window.lastOrderAt(), null);
        }
        return new OpeningStatus(false, false, paused, null, null, nextOpening(hours, now).orElse(null));
    }

    /**
     * Janela em que a casa está aberta agora, no formato que o server de validação espera:
     * abertura e último horário para pedidos (HH:mm), mais a hora atual no fuso da casa.
     */
    public Optional<OrderingWindow> orderingWindow(Store store) {
        Instant instant = clock.instant();
        LocalDateTime now = LocalDateTime.ofInstant(instant, STORE_ZONE);
        List<OpeningHours> hours = store.openingHours() == null ? List.of() : store.openingHours();
        return currentWindow(hours, now).map(window -> new OrderingWindow(
                window.opensAt(),
                window.lastOrderAt(),
                now.toLocalTime().truncatedTo(ChronoUnit.MINUTES).toString()));
    }

    public record OrderingWindow(String opensAt, String lastOrderAt, String now) {
    }

    private Optional<Window> currentWindow(List<OpeningHours> hours, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        for (LocalDate day : List.of(today, today.minusDays(1))) {
            for (OpeningHours entry : hours) {
                if (entry.weekday() != weekdayOf(day)) {
                    continue;
                }
                Window window = Window.of(day, entry);
                if (!now.isBefore(window.start()) && now.isBefore(window.end())) {
                    return Optional.of(window);
                }
            }
        }
        return Optional.empty();
    }

    private Optional<OpeningStatus.NextOpening> nextOpening(List<OpeningHours> hours, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        for (int offset = 0; offset <= DAYS_IN_WEEK; offset++) {
            LocalDate day = today.plusDays(offset);
            Optional<OpeningHours> candidate = hours.stream()
                    .filter(entry -> entry.weekday() == weekdayOf(day))
                    .filter(entry -> day.atTime(LocalTime.parse(entry.opensAt())).isAfter(now))
                    .min(Comparator.comparing(entry -> LocalTime.parse(entry.opensAt())));
            if (candidate.isPresent()) {
                OpeningHours entry = candidate.get();
                return Optional.of(new OpeningStatus.NextOpening(entry.weekday(), entry.opensAt(), offset));
            }
        }
        return Optional.empty();
    }

    private static int weekdayOf(LocalDate day) {
        return day.getDayOfWeek().getValue() % DAYS_IN_WEEK;
    }

    private record Window(LocalDateTime start, LocalDateTime end, LocalDateTime lastOrder, String opensAt,
            String closesAt, String lastOrderAt) {

        static Window of(LocalDate day, OpeningHours entry) {
            LocalTime opens = LocalTime.parse(entry.opensAt());
            LocalTime closes = LocalTime.parse(entry.closesAt());
            LocalDateTime start = day.atTime(opens);
            LocalDateTime end = closes.isAfter(opens) ? day.atTime(closes) : day.plusDays(1).atTime(closes);
            LocalDateTime lastOrder = end;
            if (entry.lastOrderAt() != null) {
                LocalTime last = LocalTime.parse(entry.lastOrderAt());
                lastOrder = last.isBefore(opens) ? day.plusDays(1).atTime(last) : day.atTime(last);
            }
            String lastOrderAt = entry.lastOrderAt() != null ? entry.lastOrderAt() : entry.closesAt();
            return new Window(start, end, lastOrder, entry.opensAt(), entry.closesAt(), lastOrderAt);
        }
    }
}
