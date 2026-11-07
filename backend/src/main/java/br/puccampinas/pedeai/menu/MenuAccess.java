package br.puccampinas.pedeai.menu;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.bson.types.ObjectId;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import br.puccampinas.pedeai.common.ForbiddenException;
import br.puccampinas.pedeai.common.InvalidRequestException;
import br.puccampinas.pedeai.common.ResourceNotFoundException;

final class MenuAccess {

    static final Set<String> VIEW_ROLES = Set.of("OWNER", "MANAGER", "KITCHEN");
    static final Set<String> EDIT_ROLES = Set.of("OWNER", "MANAGER");
    static final Set<String> AVAILABILITY_ROLES = Set.of("OWNER", "MANAGER", "KITCHEN");

    private MenuAccess() {
    }

    static void requireRole(AuthenticatedUser user, Set<String> roles) {
        if (user == null || !roles.contains(user.role())) {
            throw new ForbiddenException("Seu perfil não permite esta operação.");
        }
    }

    static ObjectId parseId(String value) {
        if (value == null || !ObjectId.isValid(value)) {
            throw new ResourceNotFoundException("Identificador inválido.");
        }
        return new ObjectId(value);
    }

    static List<ObjectId> sameIds(List<String> requested, List<ObjectId> current, String what) {
        if (requested == null || requested.size() != current.size()) {
            throw new InvalidRequestException("A nova ordem precisa ter todos os " + what + ", uma vez cada.");
        }
        List<ObjectId> ids = requested.stream()
                .map(value -> value != null && ObjectId.isValid(value) ? new ObjectId(value) : null)
                .toList();
        if (ids.contains(null) || !new HashSet<>(ids).equals(new HashSet<>(current))
                || new HashSet<>(ids).size() != ids.size()) {
            throw new InvalidRequestException("A nova ordem precisa ter todos os " + what + ", uma vez cada.");
        }
        return ids;
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
