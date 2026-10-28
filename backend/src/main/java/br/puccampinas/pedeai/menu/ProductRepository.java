package br.puccampinas.pedeai.menu;

import java.util.Collection;
import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductRepository extends MongoRepository<Product, ObjectId> {

    List<Product> findByStoreIdAndAvailableTrueOrderByPositionAsc(ObjectId storeId);

    List<Product> findByStoreIdAndIdIn(ObjectId storeId, Collection<ObjectId> ids);
}
