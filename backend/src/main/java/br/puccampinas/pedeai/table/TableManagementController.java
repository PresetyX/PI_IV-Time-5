package br.puccampinas.pedeai.table;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.puccampinas.pedeai.auth.AuthenticatedUser;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/management/tables")
public class TableManagementController {

    private final TableManagementService service;

    public TableManagementController(TableManagementService service) {
        this.service = service;
    }

    @GetMapping
    public List<ManagementTable> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ManagementTable create(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody TableRequest request) {
        return service.create(user, request);
    }

    @PutMapping("/{tableId}")
    public ManagementTable update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String tableId,
            @Valid @RequestBody TableRequest request) {
        return service.update(user, tableId, request);
    }

    @PatchMapping("/{tableId}/active")
    public ManagementTable setActive(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String tableId,
            @Valid @RequestBody TableActiveRequest request) {
        return service.setActive(user, tableId, request.active());
    }

    @PostMapping("/{tableId}/token")
    public ManagementTable regenerateToken(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String tableId) {
        return service.regenerateToken(user, tableId);
    }
}
