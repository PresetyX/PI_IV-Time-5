package br.puccampinas.pedeai.menu;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, ObjectId> {

    List<Category> findByStoreIdAndVisibleTrueOrderByPositionAsc(ObjectId storeId);

    List<Category> findByStoreIdOrderByPositionAsc(ObjectId storeId);

    Optional<Category> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
