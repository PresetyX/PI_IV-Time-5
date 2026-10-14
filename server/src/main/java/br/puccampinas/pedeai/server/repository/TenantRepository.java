package br.puccampinas.pedeai.server.repository;

import org.bson.Document;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;

public class TenantRepository {

    private final MongoCollection<Document> collection;

    public TenantRepository(MongoDatabase database) {
        this.collection = database.getCollection("tenant");
    }

    public Document findBySlug(String slug) {
        return collection.find(Filters.eq("slug", slug)).first();
    }
}
