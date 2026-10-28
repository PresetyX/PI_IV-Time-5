package br.puccampinas.pedeai.session;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GuestSessionRepository extends MongoRepository<GuestSession, ObjectId> {
}
