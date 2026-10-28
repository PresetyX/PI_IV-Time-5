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

### POST /api/orders

Envia o carrinho de uma comanda como pedido. Aceita o token de convidado (`GUEST`) e os perfis `OWNER`, `MANAGER` e `WAITER`. A loja vem sempre do token. O cliente não manda preço de item: manda o que escolheu e o total que viu na tela, e o backend recalcula tudo com o cardápio atual.

Corpo:

```json
{
  "tabId": "...",
  "totalCents": 9000,
  "ageConfirmed": false,
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "note": "sem cebola",
      "options": [{ "group": "Adicionais", "label": "Bacon extra" }]
    }
  ]
}
```

- `items`: de 1 a 25 itens. `quantity` de 1 a 20. `note` com até 140 caracteres, opcional.
- `options`: opcional. O acréscimo de cada opção vem do cardápio, nunca do corpo. Grupo obrigatório, mínimo e máximo de cada grupo são conferidos.
- `ageConfirmed`: obrigatório como `true` quando há bebida alcoólica no pedido.

Ordem das conferências:

1. A comanda existe, é da loja, está `OPEN` e (para convidado) pertence à sessão: dono ou participante não removido.
2. A casa está aberta, dentro do horário de pedidos e sem pausa.
3. Todo item existe na loja e está disponível agora.
4. Opções válidas e, se houver bebida alcoólica, `ageConfirmed` verdadeiro.
5. O backend pede `VALIDATE_ORDER` ao `server/` pelo socket (ver `protocolo.md`). Sem resposta em 3 segundos, o pedido é recusado e nada é gravado.
6. Só então o pedido é gravado, com nome e preço copiados do cardápio, o número do dia e o evento `CREATED`.

Resposta 201:

```json
{ "id": "...", "number": 7, "status": "RECEIVED", "totalCents": 9000, "createdAt": "2026-10-27T23:00:00Z" }
```

`number` recomeça em 1 a cada dia, contado pelo fuso da casa (`America/Sao_Paulo`). `totalCents` é a soma dos itens; a taxa de serviço é da comanda, não do pedido.

Erros (formato padrão, com `message` pronta para a tela):

| Status | `error` | Quando |
| --- | --- | --- |
| 400 | `validation` | Corpo inválido, identificador malformado, opção inexistente ou fora do mínimo e máximo do grupo, itens recusados pelo `server/` |
| 400 | `age_confirmation_required` | Há bebida alcoólica e `ageConfirmed` não é `true` |
| 403 | `forbidden` | O convidado não é dono nem participante da comanda |
| 404 | `not_found` | Comanda ou loja não encontrada |
| 409 | `item_unavailable` | Algum item está esgotado ou saiu do cardápio; a mensagem lista os nomes |
| 409 | `total_mismatch` | O total enviado não bate com o cardápio atual (preço mudou) |
| 409 | `store_closed` | Fora do horário de pedidos |
| 409 | `store_paused` | A casa pausou os pedidos |
| 409 | `tab_not_open` | A comanda não está `OPEN` |
| 502 | `upstream_error` | O `server/` respondeu algo inesperado; o pedido foi recusado |
| 503 | `server_unavailable` | O `server/` não respondeu em 3 segundos; o pedido foi recusado |
