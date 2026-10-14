package br.puccampinas.pedeai.mesa;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("mesas")
@CompoundIndex(name = "uniq_numero_estabelecimento", def = "{'estabelecimentoId': 1, 'numero': 1}", unique = true)
public class Mesa {

    @Id
    private String id;
    private String estabelecimentoId;
    private int numero;
    private StatusMesa status = StatusMesa.LIVRE;
    private String sessaoId;
    private Instant abertaEm;
    private Instant atualizadaEm = Instant.now();

    public enum StatusMesa {
        LIVRE, OCUPADA, AGUARDANDO_PAGAMENTO, ENCERRADA
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEstabelecimentoId() { return estabelecimentoId; }
    public void setEstabelecimentoId(String estabelecimentoId) { this.estabelecimentoId = estabelecimentoId; }
    public int getNumero() { return numero; }
    public void setNumero(int numero) { this.numero = numero; }
    public StatusMesa getStatus() { return status; }
    public void setStatus(StatusMesa status) { this.status = status; }
    public String getSessaoId() { return sessaoId; }
    public void setSessaoId(String sessaoId) { this.sessaoId = sessaoId; }
    public Instant getAbertaEm() { return abertaEm; }
    public void setAbertaEm(Instant abertaEm) { this.abertaEm = abertaEm; }
    public Instant getAtualizadaEm() { return atualizadaEm; }
    public void setAtualizadaEm(Instant atualizadaEm) { this.atualizadaEm = atualizadaEm; }
}
