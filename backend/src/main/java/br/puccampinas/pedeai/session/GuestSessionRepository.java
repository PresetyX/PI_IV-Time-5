package br.puccampinas.pedeai.session;

import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GuestSessionRepository extends MongoRepository<GuestSession, ObjectId> {

    Optional<GuestSession> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
