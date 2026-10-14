package br.puccampinas.pedeai.usuario;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("usuarios")
@CompoundIndex(name = "uniq_email_estabelecimento", def = "{'estabelecimentoId': 1, 'email': 1}", unique = true)
public class Usuario {

    @Id
    private String id;
    private String estabelecimentoId;
    private String nome;
    private String email;
    private String senhaHash;
    private PerfilAcesso perfil;
    private boolean ativo = true;
    private Instant criadoEm = Instant.now();

    public enum PerfilAcesso {
        DONO, GERENTE, GARCOM, COZINHA, CAIXA
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEstabelecimentoId() { return estabelecimentoId; }
    public void setEstabelecimentoId(String estabelecimentoId) { this.estabelecimentoId = estabelecimentoId; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
    public PerfilAcesso getPerfil() { return perfil; }
    public void setPerfil(PerfilAcesso perfil) { this.perfil = perfil; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public Instant getCriadoEm() { return criadoEm; }
    public void setCriadoEm(Instant criadoEm) { this.criadoEm = criadoEm; }
}
