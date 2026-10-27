package br.puccampinas.pedeai.user;

import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, ObjectId> {

    Optional<User> findByStoreIdAndEmail(ObjectId storeId, String email);

    Optional<User> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
