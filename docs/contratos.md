# Contratos da API

> **Aviso:** este documento está parcial. O restante do conteúdo entra nos cards PA-012 e PA-013.

## Convenções gerais

## Formato de erro

Toda resposta de erro tem o formato `{ "error": "error_code", "message": "texto" }`.

| Status | `error` | Quando |
| --- | --- | --- |
| 400 | `validation` | Corpo ou campo inválido |
| 401 | `invalid_credentials` | Login com loja, e-mail ou senha errados, ou usuário inativo |
| 404 | `not_found` | Recurso não existe |
| 409 | `conflict` | Conflito com o estado atual |
| 423 | `account_locked` | Conta bloqueada por tentativas erradas |
| 502 | `upstream_error` | O `server/` respondeu com erro |
| 503 | `server_unavailable` | O `server/` está fora do ar |

## Autenticação

O token é um JWT assinado com HS256 usando `JWT_SECRET`, que precisa ter ao menos 32 bytes. As rotas fora de `/health`, `/api/public/**` e `/api/auth/login` exigem o cabeçalho `Authorization: Bearer <token>`; sem ele ou com token inválido ou expirado, a resposta é 401.

O token carrega `sub` (id do usuário), `storeId`, `role`, `iat` e `exp`. A validade vem de `JWT_EXPIRATION_MINUTES`. O `storeId` do token é o que o backend usa para filtrar toda consulta.

### POST /api/auth/login

Corpo:

```json
{ "storeSlug": "triunfo-lanches", "email": "marcos@triunfolanches.com", "password": "..." }
```

Resposta 200:

```json
{
  "token": "...",
  "tokenType": "Bearer",
  "expiresAt": "2026-10-27T02:00:56Z",
  "user": { "id": "...", "storeId": "...", "name": "Marcos Lima", "role": "OWNER", "mustChangePassword": false }
}
```

Após 3 senhas erradas seguidas, a conta fica bloqueada por 15 minutos (`423 account_locked`), mesmo com a senha certa. O contador `failedAttempts` e a data `lockedUntil` ficam no documento `user`. Um login certo zera o contador.

### GET /api/auth/me

Devolve `userId`, `storeId` e `role` lidos do token.

## Endpoints públicos

### GET /health

Estado do server (pelo socket) e do banco. 200 quando os dois estão no ar, 503 caso contrário: `{ "status": "ok", "server": "up", "database": "connected" }`.

### GET /api/public/stores/{slug}/menu

Cardápio da loja: categorias visíveis, em ordem de `position`, cada uma com os produtos disponíveis. 404 se a loja não existe ou está inativa.

## Endpoints autenticados

### Produtos (administração)

Rotas do painel para o cardápio. Tudo é filtrado pelo `storeId` do token: produto ou categoria de outra loja responde 404 ou 400, nunca aparece.

| Rota | Perfis | O que faz |
| --- | --- | --- |
| `GET /api/management/products` | OWNER, MANAGER, KITCHEN | Todas as categorias em ordem de `position`, inclusive as ocultas, cada uma com todos os produtos, inclusive os esgotados |
| `GET /api/management/products/{id}` | OWNER, MANAGER, KITCHEN | Um produto |
| `PUT /api/management/products/{id}` | OWNER, MANAGER | Edita o produto |
| `PATCH /api/management/products/{id}/availability` | OWNER, MANAGER, KITCHEN | Liga ou desliga a disponibilidade (item esgotado) |

Perfil sem permissão recebe `403 forbidden`.

Corpo do `PUT`:

```json
{
  "categoryId": "...",
  "name": "Porção de fritas",
  "description": "500 g, sal e orégano",
  "priceCents": 3200,
  "imageUrl": null,
  "prepMinutes": 12,
  "isAlcoholic": false,
  "available": true,
  "optionGroups": null
}
```

- `priceCents` é inteiro e no mínimo 1: `3200` = R$ 32,00. O front converte o valor digitado antes de enviar.
- `isAlcoholic`, `available` e `optionGroups` são opcionais; ausentes, o valor atual é mantido.
- Trocar `categoryId` põe o produto no fim da nova categoria.
- Mudar o preço não mexe em pedidos já enviados, que guardam a cópia do preço.

Corpo do `PATCH`: `{ "available": false }`. Desligar grava `unavailableSince` com a hora atual; ligar apaga a data. Mandar o mesmo valor que já está gravado não muda nada. O cardápio público já esconde produto com `available: false`.

Resposta do produto (as três rotas de um produto devolvem o mesmo formato):

```json
{
  "id": "...", "categoryId": "...", "name": "Porção de fritas", "description": "500 g, sal e orégano",
  "priceCents": 3200, "imageUrl": null, "prepMinutes": 12, "available": false,
  "unavailableSince": "2026-10-27T23:00:00Z", "isAlcoholic": false, "position": 1, "optionGroups": []
}
```
