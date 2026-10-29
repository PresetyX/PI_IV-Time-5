package br.puccampinas.pedeai.store;

import java.time.Clock;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Service
public class StoreSettingsService {

    private static final Set<String> VIEW_ROLES = Set.of("OWNER", "MANAGER");
    private static final Set<String> MODES = Set.of("TABLE", "COUNTER", "DELIVERY");

    private final MongoTemplate mongo;
    private final Clock clock;

    public StoreSettingsService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public Settings get(AuthenticatedUser user) {
        requireRole(user, VIEW_ROLES);
        Document store = mongo.findById(user.storeId(), Document.class, "store");
        if (store == null) {
            throw new ResourceNotFoundException("Store not found");
        }
        return new Settings(store.getString("slug"), store.getString("name"), store.getString("tagline"),
                store.getString("primaryColor"), store.getList("serviceModes", String.class, List.of()),
                Boolean.TRUE.equals(store.getBoolean("requireCustomerPhone")));
    }

    public Settings update(AuthenticatedUser user, UpdateSettingsRequest request) {
        requireRole(user, Set.of("OWNER"));
        Set<String> modes = new LinkedHashSet<>(request.serviceModes() == null ? List.of() : request.serviceModes());
        if (modes.isEmpty() || !MODES.containsAll(modes)) {
            throw new InvalidRequestException("serviceModes must have at least one of TABLE, COUNTER or DELIVERY");
        }
        mongo.updateFirst(Query.query(Criteria.where("_id").is(user.storeId())),
                new Update().set("name", request.name().trim())
                        .set("tagline", request.tagline() == null ? "" : request.tagline().trim())
                        .set("primaryColor", request.primaryColor().toUpperCase())
                        .set("serviceModes", List.copyOf(modes))
                        .set("requireCustomerPhone", request.requireCustomerPhone())
                        .set("updatedAt", Date.from(clock.instant())),
                "store");
        return get(user);
    }

    private static void requireRole(AuthenticatedUser user, Set<String> roles) {
        if (user == null || !roles.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    public record Settings(String slug, String name, String tagline, String primaryColor, List<String> serviceModes,
            boolean requireCustomerPhone) {
    }

    public record UpdateSettingsRequest(@NotBlank @Size(max = 60) String name, @Size(max = 120) String tagline,
            @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String primaryColor, List<String> serviceModes,
            boolean requireCustomerPhone) {
    }
}
