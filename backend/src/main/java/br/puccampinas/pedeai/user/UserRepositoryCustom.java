package br.puccampinas.pedeai.user;

import java.time.Instant;

import org.bson.types.ObjectId;

public interface UserRepositoryCustom {

    int incrementFailedAttempts(ObjectId storeId, ObjectId userId, Instant now);

    void lock(ObjectId storeId, ObjectId userId, Instant lockedUntil, Instant now);

    void registerSuccessfulLogin(ObjectId storeId, ObjectId userId, Instant now);
}
