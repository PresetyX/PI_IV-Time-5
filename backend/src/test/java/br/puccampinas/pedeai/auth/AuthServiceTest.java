package br.puccampinas.pedeai.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import br.puccampinas.pedeai.common.AccountLockedException;
import br.puccampinas.pedeai.common.InvalidCredentialsException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;
import br.puccampinas.pedeai.user.User;
import br.puccampinas.pedeai.user.UserRepository;

class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-26T12:00:00Z");

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final ObjectId storeId = new ObjectId();
    private final ObjectId userId = new ObjectId();
    private AuthService authService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        authService = new AuthService(storeRepository, userRepository, passwordEncoder, jwtService, clock);
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store(true)));
    }

    @Test
    void successfulLoginResetsCountersAndIssuesToken() {
        User user = user(true, 2, null);
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com")).thenReturn(Optional.of(user));
        when(jwtService.issue(user)).thenReturn(new IssuedToken("jwt-value", NOW.plusSeconds(3600)));

        LoginResponse response = authService.login(new LoginRequest("demo", "owner@demo.com", "secret123"));

        assertEquals("jwt-value", response.token());
        assertEquals("Bearer", response.tokenType());
        assertEquals(userId.toHexString(), response.user().id());
        assertEquals(storeId.toHexString(), response.user().storeId());
        assertEquals("OWNER", response.user().role());
        verify(userRepository).registerSuccessfulLogin(storeId, userId, NOW);
    }

    @Test
    void wrongPasswordCountsTheAttemptAndReturnsInvalidCredentials() {
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com"))
                .thenReturn(Optional.of(user(true, 0, null)));
        when(userRepository.incrementFailedAttempts(storeId, userId, NOW)).thenReturn(1);

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("demo", "owner@demo.com", "wrong")));

        verify(userRepository).incrementFailedAttempts(storeId, userId, NOW);
        verify(userRepository, never()).lock(any(), any(), any(), any());
        verify(jwtService, never()).issue(any());
    }

    @Test
    void thirdWrongPasswordLocksForFifteenMinutes() {
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com"))
                .thenReturn(Optional.of(user(true, 2, null)));
        when(userRepository.incrementFailedAttempts(storeId, userId, NOW)).thenReturn(3);

        AccountLockedException locked = assertThrows(AccountLockedException.class,
                () -> authService.login(new LoginRequest("demo", "owner@demo.com", "wrong")));

        Instant expectedUnlock = NOW.plusSeconds(15 * 60);
        assertEquals(expectedUnlock, locked.getLockedUntil());
        verify(userRepository).lock(storeId, userId, expectedUnlock, NOW);
    }

    @Test
    void lockedAccountIsRejectedEvenWithCorrectPassword() {
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com"))
                .thenReturn(Optional.of(user(true, 0, NOW.plusSeconds(60))));

        assertThrows(AccountLockedException.class,
                () -> authService.login(new LoginRequest("demo", "owner@demo.com", "secret123")));

        verify(userRepository, never()).registerSuccessfulLogin(any(), any(), any());
        verify(userRepository, never()).incrementFailedAttempts(any(), any(), any());
    }

    @Test
    void expiredLockAllowsLoginAgain() {
        User user = user(true, 0, NOW.minusSeconds(1));
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com")).thenReturn(Optional.of(user));
        when(jwtService.issue(user)).thenReturn(new IssuedToken("jwt-value", NOW.plusSeconds(3600)));

        LoginResponse response = authService.login(new LoginRequest("demo", "owner@demo.com", "secret123"));

        assertEquals("jwt-value", response.token());
        verify(userRepository).registerSuccessfulLogin(eq(storeId), eq(userId), eq(NOW));
    }

    @Test
    void unknownStoreUnknownUserAndInactiveUserLookTheSame() {
        when(storeRepository.findBySlug("nope")).thenReturn(Optional.empty());
        when(userRepository.findByStoreIdAndEmail(storeId, "ghost@demo.com")).thenReturn(Optional.empty());
        when(userRepository.findByStoreIdAndEmail(storeId, "owner@demo.com"))
                .thenReturn(Optional.of(user(false, 0, null)));

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("nope", "owner@demo.com", "secret123")));
        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("demo", "ghost@demo.com", "secret123")));
        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("demo", "owner@demo.com", "secret123")));
        verify(userRepository, never()).incrementFailedAttempts(any(), any(), any());
    }

    private Store store(boolean active) {
        return new Store(storeId, "demo", "Demo", null, null, null, null, null, "#D62F1F", null, null, null,
                1000, 500, null, null, null, false, active, null, null);
    }

    private User user(boolean active, int failedAttempts, Instant lockedUntil) {
        return new User(userId, storeId, "Owner", "owner@demo.com", passwordEncoder.encode("secret123"), "OWNER",
                active, false, failedAttempts, lockedUntil, null, NOW, null);
    }
}
