# Contratos da API

> **Aviso:** este documento está apenas com a estrutura. O conteúdo entra nos cards PA-012 e PA-013.

## Convenções gerais

## Formato de erro

## Autenticação

### POST /api/auth/login
Autentica um usuário da equipe e retorna um token JWT.

**Request**
```json
{
  "estabelecimentoId": "64f...",
  "email": "garcom@bar.com",
  "senha": "senha123"
}
```

**Response 200**
```json
{
  "token": "eyJ...",
  "tipo": "Bearer",
  "expiraEmSegundos": 28800,
  "usuario": {
    "id": "64f...",
    "estabelecimentoId": "64f...",
    "nome": "Pedro",
    "email": "garcom@bar.com",
    "perfil": "GARCOM",
    "ativo": true
  }
}
```

**Erros**
- `401` — `credenciais_invalidas`

## Endpoints públicos

## Endpoints autenticados

## Mesas

### POST /api/mesas/abrir
Abre uma sessão para uma mesa livre. Exige perfil `DONO`, `GERENTE` ou `GARCOM`.

**Request**
```json
{
  "estabelecimentoId": "64f...",
  "numero": 12
}
```

**Response 200**
```json
{
  "id": "64f...",
  "estabelecimentoId": "64f...",
  "numero": 12,
  "status": "OCUPADA",
  "sessaoId": "64f...",
  "abertaEm": "2026-10-14T03:00:00Z"
}
```

**Erros**
- `404` — `mesa_nao_encontrada`
- `409` — `mesa_ja_aberta`

### POST /api/mesas/{estabelecimentoId}/{numero}/encerrar
Encerra a sessão aberta e libera a mesa.

**Response 200**
```json
{
  "id": "64f...",
  "estabelecimentoId": "64f...",
  "numero": 12,
  "status": "LIVRE",
  "sessaoId": null,
  "abertaEm": null
}
```

**Erros**
- `404` — `mesa_nao_encontrada`
- `409` — `mesa_sem_sessao_aberta`
