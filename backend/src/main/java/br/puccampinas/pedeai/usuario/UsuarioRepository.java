package br.puccampinas.pedeai.usuario;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {
    Optional<Usuario> findByEstabelecimentoIdAndEmailIgnoreCase(String estabelecimentoId, String email);
    boolean existsByEstabelecimentoIdAndEmailIgnoreCase(String estabelecimentoId, String email);
}
