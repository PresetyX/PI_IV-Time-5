package br.puccampinas.pedeai.table;

import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TableRepository extends MongoRepository<Table, ObjectId> {

    Optional<Table> findByToken(String token);

    Optional<Table> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
