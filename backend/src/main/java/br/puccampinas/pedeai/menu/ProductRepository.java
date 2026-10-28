package br.puccampinas.pedeai.menu;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductRepository extends MongoRepository<Product, ObjectId> {

    List<Product> findByStoreIdAndAvailableTrueOrderByPositionAsc(ObjectId storeId);

    List<Product> findByStoreIdOrderByPositionAsc(ObjectId storeId);

    List<Product> findByStoreIdAndCategoryIdOrderByPositionAsc(ObjectId storeId, ObjectId categoryId);

    Optional<Product> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
