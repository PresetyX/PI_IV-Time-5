package br.puccampinas.pedeai.menu;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, ObjectId> {

    List<Category> findByStoreIdAndVisibleTrueOrderByPositionAsc(ObjectId storeId);
}
