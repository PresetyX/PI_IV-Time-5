package br.puccampinas.pedeai.mesa;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("sessoes_mesa")
public class SessaoMesa {

    @Id
    private String id;
    private String estabelecimentoId;
    private String mesaId;
    private int numeroMesa;
    private StatusSessao status = StatusSessao.ABERTA;
    private Instant abertaEm = Instant.now();
    private Instant encerradaEm;

    public enum StatusSessao {
        ABERTA, ENCERRADA
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEstabelecimentoId() { return estabelecimentoId; }
    public void setEstabelecimentoId(String estabelecimentoId) { this.estabelecimentoId = estabelecimentoId; }
    public String getMesaId() { return mesaId; }
    public void setMesaId(String mesaId) { this.mesaId = mesaId; }
    public int getNumeroMesa() { return numeroMesa; }
    public void setNumeroMesa(int numeroMesa) { this.numeroMesa = numeroMesa; }
    public StatusSessao getStatus() { return status; }
    public void setStatus(StatusSessao status) { this.status = status; }
    public Instant getAbertaEm() { return abertaEm; }
    public void setAbertaEm(Instant abertaEm) { this.abertaEm = abertaEm; }
    public Instant getEncerradaEm() { return encerradaEm; }
    public void setEncerradaEm(Instant encerradaEm) { this.encerradaEm = encerradaEm; }
}
