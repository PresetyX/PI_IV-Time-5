package br.puccampinas.pedeai.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.common.AccountLockedException;
import br.puccampinas.pedeai.common.InvalidCredentialsException;
import br.puccampinas.pedeai.store.Store;
import br.puccampinas.pedeai.store.StoreRepository;
import br.puccampinas.pedeai.user.User;
import br.puccampinas.pedeai.user.UserRepository;

@Service
public class AuthService {

    public static final int MAX_FAILED_ATTEMPTS = 3;
    public static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Clock clock;
    private final String unknownUserHash;

    public AuthService(StoreRepository storeRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, Clock clock) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.clock = clock;
        this.unknownUserHash = passwordEncoder.encode("unknown-user");
    }

    public LoginResponse login(LoginRequest request) {
        Instant now = clock.instant();

        Store store = storeRepository.findBySlug(request.storeSlug()).filter(Store::active).orElse(null);
        User user = store == null ? null
                : userRepository.findByStoreIdAndEmail(store.id(), request.email().trim())
                        .filter(User::active)
                        .orElse(null);
        if (user == null) {
            passwordEncoder.matches(request.password(), unknownUserHash);
            throw new InvalidCredentialsException();
        }

        if (user.lockedUntil() != null && user.lockedUntil().isAfter(now)) {
            throw new AccountLockedException(user.lockedUntil());
        }

        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            registerFailure(user, now);
            throw new InvalidCredentialsException();
        }

        userRepository.registerSuccessfulLogin(user.storeId(), user.id(), now);
        IssuedToken token = jwtService.issue(user);
        return new LoginResponse(
                token.value(),
                "Bearer",
                token.expiresAt(),
                new LoginResponse.UserInfo(
                        user.id().toHexString(),
                        user.storeId().toHexString(),
                        user.name(),
                        user.role(),
                        Boolean.TRUE.equals(user.mustChangePassword())));
    }

    private void registerFailure(User user, Instant now) {
        int attempts = userRepository.incrementFailedAttempts(user.storeId(), user.id(), now);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            Instant lockedUntil = now.plus(LOCK_DURATION);
            userRepository.lock(user.storeId(), user.id(), lockedUntil, now);
            throw new AccountLockedException(lockedUntil);
        }
    }
}
