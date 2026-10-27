package br.puccampinas.pedeai.table;

import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TableRepository extends MongoRepository<Table, ObjectId> {

    Optional<Table> findByStoreIdAndToken(ObjectId storeId, String token);

    Optional<Table> findByStoreIdAndNumber(ObjectId storeId, int number);
}
