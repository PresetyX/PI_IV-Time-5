package br.puccampinas.pedeai.mesa;

import br.puccampinas.pedeai.mesa.dto.AbrirMesaRequest;
import br.puccampinas.pedeai.mesa.dto.MesaResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class MesaService {

    private final MesaRepository mesas;
    private final SessaoMesaRepository sessoes;

    public MesaService(MesaRepository mesas, SessaoMesaRepository sessoes) {
        this.mesas = mesas;
        this.sessoes = sessoes;
    }

    @Transactional
    public MesaResponse abrirMesa(AbrirMesaRequest request) {
        Mesa mesa = mesas
                .findByEstabelecimentoIdAndNumero(request.estabelecimentoId(), request.numero())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "mesa_nao_encontrada"));

        boolean existeSessaoAberta = sessoes
                .findByEstabelecimentoIdAndMesaIdAndStatus(
                        request.estabelecimentoId(),
                        mesa.getId(),
                        SessaoMesa.StatusSessao.ABERTA
                )
                .isPresent();

        if (existeSessaoAberta || mesa.getStatus() == Mesa.StatusMesa.OCUPADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "mesa_ja_aberta");
        }

        SessaoMesa sessao = new SessaoMesa();
        sessao.setEstabelecimentoId(request.estabelecimentoId());
        sessao.setMesaId(mesa.getId());
        sessao.setNumeroMesa(mesa.getNumero());
        sessao = sessoes.save(sessao);

        mesa.setStatus(Mesa.StatusMesa.OCUPADA);
        mesa.setSessaoId(sessao.getId());
        mesa.setAbertaEm(Instant.now());
        mesa.setAtualizadaEm(Instant.now());
        mesa = mesas.save(mesa);

        return MesaResponse.de(mesa);
    }

    @Transactional
    public MesaResponse encerrarMesa(String estabelecimentoId, int numero) {
        Mesa mesa = mesas
                .findByEstabelecimentoIdAndNumero(estabelecimentoId, numero)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "mesa_nao_encontrada"));

        SessaoMesa sessao = sessoes
                .findByEstabelecimentoIdAndMesaIdAndStatus(
                        estabelecimentoId,
                        mesa.getId(),
                        SessaoMesa.StatusSessao.ABERTA
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "mesa_sem_sessao_aberta"));

        sessao.setStatus(SessaoMesa.StatusSessao.ENCERRADA);
        sessao.setEncerradaEm(Instant.now());
        sessoes.save(sessao);

        mesa.setStatus(Mesa.StatusMesa.LIVRE);
        mesa.setSessaoId(null);
        mesa.setAbertaEm(null);
        mesa.setAtualizadaEm(Instant.now());

        return MesaResponse.de(mesas.save(mesa));
    }
}
