package br.puccampinas.pedeai.server.service;

import java.util.Map;

import org.bson.Document;

import br.puccampinas.pedeai.server.protocol.CommandException;
import br.puccampinas.pedeai.server.repository.TenantRepository;

public class TenantService {

    private final TenantRepository tenantRepository;

    public TenantService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Map<String, Object> getBySlug(String slug) {
        Document tenant = tenantRepository.findBySlug(slug);
        if (tenant == null) {
            throw new CommandException("NOT_FOUND", "Tenant not found: " + slug);
        }
        return Documents.toMap(tenant);
    }
}
