package br.puccampinas.pedeai.server.repository;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;

public class CategoryRepository extends BaseRepository {

    public CategoryRepository(MongoDatabase database) {
        super(database, "category");
    }

    public List<Document> findActive(ObjectId tenantId) {
        return findByTenant(tenantId, Filters.eq("active", true))
                .sort(Sorts.ascending("sortOrder", "name"))
                .into(new ArrayList<>());
    }
}
