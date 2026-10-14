package br.puccampinas.pedeai.server.repository;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;

public class ProductRepository extends BaseRepository {

    public ProductRepository(MongoDatabase database) {
        super(database, "product");
    }

    public List<Document> findAvailable(ObjectId tenantId) {
        return findByTenant(tenantId, Filters.eq("available", true))
                .sort(Sorts.ascending("sortOrder", "name"))
                .into(new ArrayList<>());
    }
}
