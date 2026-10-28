package br.puccampinas.pedeai.tab;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TabRepository extends MongoRepository<Tab, ObjectId> {

    List<Tab> findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(ObjectId storeId, ObjectId tableId, String status);

    Optional<Tab> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
