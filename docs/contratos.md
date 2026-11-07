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
| 409 | `price_changed` | Pedido recusado: o total enviado pelo cliente não confere com os preços do banco |
| 409 | `store_closed` | Pedido recusado: a casa não está aceitando pedidos agora |
| 409 | `item_unavailable` | Pedido recusado: um produto acabou (`available: false`) ou saiu do cardápio |
| 422 | `age_confirmation_required` | Pedido recusado: tem bebida alcoólica e o cliente não confirmou a maioridade |
| 423 | `account_locked` | Conta bloqueada por tentativas erradas |
| 502 | `upstream_error` | O `server/` respondeu com erro |
| 503 | `server_unavailable` | O `server/` está fora do ar |
| 503 | `validation_unavailable` | Pedido recusado: o `server/` não validou em 3 segundos ou respondeu algo inesperado |

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
| `POST /api/management/products` | OWNER, MANAGER | Cria o produto no fim da categoria, disponível por padrão |
| `PUT /api/management/products/{id}` | OWNER, MANAGER | Edita o produto |
| `PATCH /api/management/products/{id}/availability` | OWNER, MANAGER, KITCHEN | Liga ou desliga a disponibilidade (item esgotado) |

Perfil sem permissão recebe `403 forbidden`.

Corpo do `POST` e do `PUT`:

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
- `isAlcoholic`, `available` e `optionGroups` são opcionais. No `PUT`, ausentes mantêm o valor atual; no `POST`, valem `false`, `true` e lista vazia.
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

## Endpoints do cliente (token de convidado)

### POST /api/tabs/mine/orders

Envia um pedido para a comanda do cliente. Exige o token de convidado (`role` `GUEST`).

Corpo:

```json
{
  "items": [
    {
      "productId": "...", "quantity": 1, "note": "sem cebola",
      "options": [{ "group": "Ponto da carne", "label": "Ao ponto" }, { "group": "Adicionais", "label": "Bacon extra" }]
    },
    { "productId": "...", "quantity": 2 }
  ],
  "expectedTotalCents": 6000,
  "ageConfirmed": true
}
```

- `items`: de 1 a 30 itens. `quantity` vai de 1 a 20 e `note` tem até 140 caracteres (opcional).
- `options`: opcional, até 20 por item, pelo nome do grupo e da opção cadastrados em `optionGroups` do produto. O acréscimo de cada opção vem do cadastro, nunca do cliente. Grupo ou opção que não existe, opção repetida, grupo obrigatório sem escolha ou grupo acima do `max`: 400 `validation`.
- `expectedTotalCents`: obrigatório. É o total que o cliente viu na tela, em centavos.
- `ageConfirmed`: opcional (ausente vale `false`). Precisa ser `true` quando algum produto tem `isAlcoholic`. O front pede a confirmação uma vez por visita (mesma sessão de convidado).

Ordem das verificações. Em qualquer recusa, nada é gravado e nenhum número de pedido é consumido:

1. O cliente precisa ter comanda aberta. Se não tiver: 404.
2. A casa precisa estar aceitando pedidos (horário, pausa). Se não estiver: 409 `store_closed`.
3. Todos os produtos precisam existir na loja e estar disponíveis; senão 409 `item_unavailable`. As opções de cada item são conferidas (ver acima).
4. Se algum produto tem `isAlcoholic` e `ageConfirmed` não é `true`: 422 `age_confirmation_required`. O `server/` nem é chamado.
5. O backend calcula o total com os preços do banco e pede o `VALIDATE_ORDER` ao `server/` (ver `docs/protocolo.md`). Como closeAt, vai o último horário de pedido (`lastOrderAt`), ou o horário de fechamento se a casa não tiver um.
   - `TOTAL_MISMATCH`: 409 `price_changed`.
   - `CLOSED_HOURS`: 409 `store_closed`.
   - `INVALID_PARAMS`: 400 `validation`.
   - Sem resposta em 3 segundos (somando conexão, envio e leitura), server fora do ar ou resposta inesperada: 503 `validation_unavailable`.
6. Validado, o pedido recebe o número do dia, é gravado com cópia de nome e preço de cada item (e `ageConfirmed: true` quando tem bebida alcoólica) e ganha um `orderEvent` `CREATED`.

Cada item gravado traz `unitPriceCents` já com as opções somadas (o preço que o cliente paga por unidade), `basePriceCents` com o preço do produto sem opções e `options` com `group`, `label` e `deltaCents` de cada opção. Por isso conta, fechamento, comissão e relatórios continuam somando `quantity × unitPriceCents`. Ao server vão o preço sem opções e os `deltaCents`, que ele soma.

Resposta `201`:

```json
{ "id": "...", "number": 7, "status": "RECEIVED", "totalCents": 6000 }
```

## Operação do pedido (equipe)

Todas exigem o token da equipe. Toda mudança grava um documento em `orderEvent` (só inserção) e um passo em `order.statusHistory`, que é o que o acompanhamento do cliente lê.

### PATCH /api/operations/orders/{id}/status

Já existia (`KitchenController`). Agora também grava `orderEvent` `STATUS_CHANGED` com `from`, `to`, `byUserId` e `at`.

### POST /api/operations/orders/{id}/cancel

Perfis: `OWNER`, `MANAGER`, `KITCHEN`. Cancela o pedido inteiro.

```json
{ "reason": "OUT_OF_STOCK", "note": "acabou o pão" }
```

- `reason`: `GAVE_UP` (cliente desistiu), `WRONG_ORDER` (lançado errado), `OUT_OF_STOCK` (faltou ingrediente) ou `DUPLICATE` (duplicado). Outro valor: 400 `validation`.
- `note`: opcional, até 140 caracteres.
- Só pedido `RECEIVED` ou `PREPARING`. Pronto, entregue ou já cancelado: 409 `conflict`. Pedido de outra loja ou inexistente: 404.
- Grava no pedido `status: CANCELLED`, `cancelReason`, `cancelledByUserId`, `cancelledAt` e `cancelNote`; os itens ativos viram `CANCELLED`. Grava `orderEvent` `CANCELLED` com `reason` e recalcula a comanda, que deixa de cobrar o pedido.

Resposta `200`: `{ "id": "...", "status": "CANCELLED" }`

### POST /api/operations/orders/{id}/deliver

Perfis: `OWNER`, `MANAGER`, `WAITER`. Entrega parcial ou total de um pedido pronto.

```json
{ "itemIndexes": [0, 2] }
```

- `itemIndexes`: posições dos itens em `order.items` (o pedido não tem id por item).
- Só pedido `READY`; item já entregue ou cancelado, ou pedido alterado em outra tela entre a leitura e a gravação: 409 `conflict`.
- Os itens escolhidos viram `DELIVERED` com `deliveredAt`. Grava `orderEvent` `ITEMS_DELIVERED` com `itemIndexes`.
- Se não sobrar item ativo por entregar, o pedido vira `DELIVERED` (com `deliveredAt`) e ganha também um `orderEvent` `STATUS_CHANGED` de `READY` para `DELIVERED`.

Resposta `200`: `{ "id": "...", "status": "READY" }` (ainda falta item) ou `"DELIVERED"`.

> O tipo `ITEMS_DELIVERED` foi acrescentado ao validador de `orderEvent` em `banco/init-mongo.js`. Banco criado antes disso precisa rodar o `init-mongo.js` de novo (só atualiza validadores e índices).

## Balcão

Fluxo: o cliente entra em `/t/:slug/balcao` (sessão `mode: COUNTER`, sem mesa), abre a comanda de balcão (`POST /api/tabs`) e pede pelas mesmas rotas da mesa. O pedido nasce `AWAITING_PAYMENT` e **não aparece na cozinha** até a equipe registrar o pagamento no caixa; aí vira `RECEIVED`. Quando tudo foi retirado e pago, a comanda fecha sozinha.

- Comanda de balcão: `mode: COUNTER`, sem `tableId`, sem taxa de serviço. As rotas `/api/tabs/**` aceitam a sessão de balcão; `tableNumber` vem `0`. `TabResponse` ganhou `mode` e `pickupTicket`.
- Outras pessoas entram pelo link de convite `/t/:slug/balcao?entrar=<tabId>` mais o código de 4 dígitos (não há mesa para listar as comandas).
- Senha (`pickupTicket`): gerada no primeiro pedido da comanda, a partir de `sequence` com `_id` `<storeId>:<AAAA-MM-DD>:PICKUP` (recomeça em 1 a cada dia). Fica em `tab.pickupTicket` e é copiada em cada `order.pickupTicket`. A resposta de `POST /api/tabs/mine/orders` traz `pickupTicket` (nulo no pedido de mesa) e `status` `AWAITING_PAYMENT`.

### GET /api/tabs/mine/pickup

Token de convidado. A comanda de balcão mais recente da sessão, aberta ou fechada (para mostrar "retirada confirmada").

```json
{
  "tabId": "...", "pickupTicket": 12, "tabStatus": "OPEN", "customerName": "Bia",
  "totalCents": 3800, "paidCents": 0,
  "orders": [{ "id": "...", "number": 41, "status": "AWAITING_PAYMENT", "totalCents": 3800, "createdAt": "...",
               "items": [{ "name": "X-bacon", "quantity": 1, "options": ["Ao ponto"], "status": "AWAITING_PAYMENT" }] }]
}
```

Sem comanda de balcão: 404.

### POST /api/operations/orders/{id}/pay

Perfis: `OWNER`, `MANAGER`, `WAITER`. Corpo: `{ "method": "PIX_MANUAL" }` (`PIX_MANUAL`, `CASH`, `CARD_DEBIT` ou `CARD_CREDIT`).

- Só pedido `AWAITING_PAYMENT`; outro status: 409 `conflict`.
- Pedido e itens viram `RECEIVED` (entra na fila da cozinha), com passo em `statusHistory` e `orderEvent` `STATUS_CHANGED`.
- Grava `payment` com `amountCents` igual ao total do pedido, `orderId` e `isPartial: true`, e soma em `tab.paidCents`.

Resposta `200`: `{ "id": "...", "status": "RECEIVED" }`

Cancelar (`POST /api/operations/orders/{id}/cancel`) também aceita pedido `AWAITING_PAYMENT`. Na entrega (`/deliver`), quando o último pedido da comanda de balcão é retirado e `paidCents` cobre o total, a comanda vira `CLOSED`.

### GET /api/public/stores/{slug}/pickup-board

Público, para o painel de TV em `/t/:slug/painel`. Só números das senhas de hoje, já pagas:

```json
{ "storeName": "Triunfo Lanches", "preparing": [10, 12], "ready": [9] }
```

Senha com algum pedido pronto aparece só em `ready`.

> O status `AWAITING_PAYMENT` e o campo `pickupTicket` foram acrescentados ao validador em `banco/init-mongo.js`. Banco criado antes precisa rodar o `init-mongo.js` de novo.

### Categorias (administração)

| Rota | Perfis | O que faz |
| --- | --- | --- |
| `GET /api/management/categories` | OWNER, MANAGER, KITCHEN | Categorias em ordem, com a quantidade de produtos de cada uma |
| `POST /api/management/categories` | OWNER, MANAGER | Cria a categoria no fim da lista |
| `PUT /api/management/categories/{id}` | OWNER, MANAGER | Renomeia, oculta ou mostra |
| `DELETE /api/management/categories/{id}` | OWNER, MANAGER | Apaga a categoria vazia; com produto, só oculta |
| `PUT /api/management/categories/order` | OWNER, MANAGER | Nova ordem das categorias |
| `PUT /api/management/categories/{id}/products/order` | OWNER, MANAGER | Nova ordem dos produtos da categoria |

Corpo do `POST` e do `PUT`: `{ "name": "Porções", "visible": true }`. `name` tem até 40 caracteres e não repete na loja, sem diferenciar maiúsculas (`409 conflict`). `visible` é opcional: ausente, vale `true` ao criar e mantém o valor atual ao editar.

Resposta da categoria: `{ "id": "...", "name": "Porções", "position": 2, "visible": true, "products": 5 }`.

O `DELETE` responde 200 com `{ "outcome": "DELETED" | "HIDDEN", "category": { ... } }`. Categoria com produto nunca é apagada: ela fica oculta (`visible: false`), some do cardápio do cliente e os produtos continuam no painel.

As duas rotas de ordem recebem `{ "ids": ["...", "..."] }` com todos os ids, uma vez cada, na ordem nova; faltando ou sobrando id, a resposta é `400 validation`. As posições passam a ser 1, 2, 3...

### Mesas (administração)

| Rota | Perfis | O que faz |
| --- | --- | --- |
| `GET /api/management/tables` | OWNER, MANAGER | Todas as mesas em ordem de número, inclusive as desativadas, com a quantidade de comandas abertas |
| `POST /api/management/tables` | OWNER, MANAGER | Cria a mesa ativa, já com o token do QR |
| `PUT /api/management/tables/{id}` | OWNER, MANAGER | Muda número, apelido e lugares; o token continua o mesmo |
| `PATCH /api/management/tables/{id}/active` | OWNER, MANAGER | Ativa ou desativa a mesa |
| `POST /api/management/tables/{id}/token` | OWNER, MANAGER | Gera um token novo; o QR antigo para de funcionar |

Corpo do `POST` e do `PUT`: `{ "number": 12, "nickname": "Varanda", "seats": 4 }`. `number` vai de 1 a 999 e não repete na loja (`409 conflict`); `nickname` (até 30 caracteres) e `seats` (1 a 50) são opcionais.

Corpo do `PATCH`: `{ "active": false }`.

Resposta da mesa: `{ "id": "...", "number": 12, "nickname": "Varanda", "seats": 4, "token": "t12-k3m9p2qa", "active": true, "createdAt": "...", "openTabs": 0 }`.

- O token tem o formato `t<número>-<8 letras e números>` e é único entre todas as lojas. O QR leva para `/t/{slug}/{token}`.
- Mesa desativada derruba o QR: `GET /api/public/stores/{slug}/tables/{token}` e a busca por número respondem 404, e o cliente não consegue abrir sessão nela. Ao reativar, a mesma plaquinha volta a funcionar.
- Não dá para desativar mesa com comanda aberta (`409 conflict`): feche as comandas antes.
