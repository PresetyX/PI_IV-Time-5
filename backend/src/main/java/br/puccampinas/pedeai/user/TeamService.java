package br.puccampinas.pedeai.user;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;

import org.bson.types.ObjectId;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ConflictException;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Service
public class TeamService {

    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final int TEMPORARY_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public TeamService(UserRepository userRepository, PasswordEncoder passwordEncoder, Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    public Invitation invite(AuthenticatedUser owner, InviteRequest request) {
        requireOwner(owner);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByStoreIdAndEmail(owner.storeId(), email).isPresent()) {
            throw new ConflictException("There is already someone with this e-mail");
        }
        String password = temporaryPassword();
        Instant now = clock.instant();
        User user = userRepository.insert(new User(new ObjectId(), owner.storeId(), request.name().trim(), email,
                passwordEncoder.encode(password), request.role(), true, true, 0, null, null, now, now));
        return new Invitation(user.id().toHexString(), user.name(), user.email(), user.role(), password);
    }

    public void deactivate(AuthenticatedUser owner, String userId) {
        requireOwner(owner);
        if (!ObjectId.isValid(userId)) {
            throw new InvalidRequestException("Invalid user id");
        }
        User user = userRepository.findById(new ObjectId(userId))
                .filter(found -> found.storeId().equals(owner.storeId()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.id().equals(owner.userId())) {
            throw new ConflictException("You cannot deactivate yourself");
        }
        userRepository.save(new User(user.id(), user.storeId(), user.name(), user.email(), user.passwordHash(),
                user.role(), false, user.mustChangePassword(), user.failedAttempts(), user.lockedUntil(),
                user.lastLoginAt(), user.createdAt(), clock.instant()));
    }

    private String temporaryPassword() {
        StringBuilder password = new StringBuilder();
        for (int i = 0; i < TEMPORARY_PASSWORD_LENGTH; i++) {
            password.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return password.toString();
    }

    private static void requireOwner(AuthenticatedUser user) {
        if (user == null || !"OWNER".equals(user.role())) {
            throw new ForbiddenException("Só o dono pode mudar a equipe.");
        }
    }

    public record InviteRequest(@NotBlank @Size(max = 60) String name, @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "OWNER|MANAGER|WAITER|KITCHEN") String role) {
    }

    public record Invitation(String id, String name, String email, String role, String temporaryPassword) {
    }
}
