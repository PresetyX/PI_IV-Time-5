package br.puccampinas.pedeai.server.repository;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;

public abstract class BaseRepository {

    protected final MongoCollection<Document> collection;

    protected BaseRepository(MongoDatabase database, String collectionName) {
        this.collection = database.getCollection(collectionName);
    }

    protected FindIterable<Document> findByTenant(ObjectId tenantId, Bson filter) {
        return collection.find(Filters.and(Filters.eq("tenantId", tenantId), filter));
    }

    protected FindIterable<Document> findByTenant(ObjectId tenantId) {
        return collection.find(Filters.eq("tenantId", tenantId));
    }

    protected Document findOneByTenant(ObjectId tenantId, Bson filter) {
        return findByTenant(tenantId, filter).first();
    }
}
