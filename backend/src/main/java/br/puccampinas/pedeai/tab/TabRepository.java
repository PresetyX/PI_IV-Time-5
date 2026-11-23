/*
 * Autor: Bruno Terra Silverio
 * RA: 25022630
 */
package br.puccampinas.pedeai.tab;

import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

/** Acesso às comandas no MongoDB. */
public interface TabRepository extends MongoRepository<Tab, ObjectId> {

    /** Comandas de uma mesa com o status dado, da mais antiga para a mais nova. */
    List<Tab> findByStoreIdAndTableIdAndStatusOrderByOpenedAtAsc(ObjectId storeId, ObjectId tableId, String status);

    /** Busca a comanda pelo id, só se ela for da loja informada. */
    Optional<Tab> findByStoreIdAndId(ObjectId storeId, ObjectId id);
}
