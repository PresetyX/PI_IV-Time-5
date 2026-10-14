package br.puccampinas.pedeai.mesa;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface MesaRepository extends MongoRepository<Mesa, String> {
    Optional<Mesa> findByEstabelecimentoIdAndNumero(String estabelecimentoId, int numero);
}
