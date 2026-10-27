package br.puccampinas.pedeai.user;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

public class UserRepositoryImpl implements UserRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public UserRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public int incrementFailedAttempts(ObjectId storeId, ObjectId userId, Instant now) {
        Update update = new Update().inc("failedAttempts", 1).set("updatedAt", now);
        User updated = mongoTemplate.findAndModify(
                byStoreAndId(storeId, userId), update, FindAndModifyOptions.options().returnNew(true), User.class);
        if (updated == null || updated.failedAttempts() == null) {
            return 0;
        }
        return updated.failedAttempts();
    }

    @Override
    public void lock(ObjectId storeId, ObjectId userId, Instant lockedUntil, Instant now) {
        Update update = new Update()
                .set("lockedUntil", lockedUntil)
                .set("failedAttempts", 0)
                .set("updatedAt", now);
        mongoTemplate.updateFirst(byStoreAndId(storeId, userId), update, User.class);
    }

    @Override
    public void registerSuccessfulLogin(ObjectId storeId, ObjectId userId, Instant now) {
        Update update = new Update()
                .set("failedAttempts", 0)
                .unset("lockedUntil")
                .set("lastLoginAt", now)
                .set("updatedAt", now);
        mongoTemplate.updateFirst(byStoreAndId(storeId, userId), update, User.class);
    }

    private Query byStoreAndId(ObjectId storeId, ObjectId userId) {
        return query(where("storeId").is(storeId).and("_id").is(userId));
    }
}
