package br.puccampinas.pedeai.mesa;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SessaoMesaRepository extends MongoRepository<SessaoMesa, String> {
    Optional<SessaoMesa> findByEstabelecimentoIdAndMesaIdAndStatus(
            String estabelecimentoId,
            String mesaId,
            SessaoMesa.StatusSessao status
    );
}
