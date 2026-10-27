package br.puccampinas.pedeai.store;

import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StoreRepository extends MongoRepository<Store, ObjectId> {

    Optional<Store> findBySlug(String slug);
}
