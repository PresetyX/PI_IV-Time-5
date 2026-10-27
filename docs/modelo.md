# Modelo de dados

> **Aviso:** o conteúdo deste documento é descrito em português, mas todos os identificadores (coleções, campos e valores de status) são em inglês.

## Visão geral

O banco é o MongoDB, database `pedeai`. Somente o processo `server/` acessa o banco. Toda coleção, exceto `tenant`, tem o campo `tenantId`, e toda consulta filtra por ele.

Convenções:

- Identificadores de coleção no singular e em minúsculas: `tenant`, `bill`, `order`.
- Campos em camelCase.
- Valores de status e de enumeração em maiúsculas: `OPEN`, `PREPARING`, `MANAGER`.
- Dinheiro em centavos, sempre inteiro (`priceCents`, `totalCents`).
- Datas em UTC.
- Referências entre coleções são `ObjectId` com sufixo `Id` (`billId`, `productId`).

O script `server/scripts/init-db.js` cria as coleções com validação, os índices e um estabelecimento de demonstração. Ver [Criando o banco](#criando-o-banco).

## Coleções

| Coleção | Descrição |
| --- | --- |
| `tenant` | Estabelecimento (o cliente do whitelabel). É a raiz de todos os outros dados. |
| `user` | Usuário da equipe do estabelecimento, com perfil de acesso. |
| `table` | Mesa do salão, com o número usado no QR code. |
| `category` | Categoria do cardápio. |
| `product` | Produto do cardápio. |
| `customerSession` | Identificação do cliente que entrou por QR code ou link. |
| `bill` | Conta (comanda) aberta por mesa ou balcão. |
| `order` | Pedido enviado para a cozinha, vinculado a uma conta. |
| `orderItem` | Item do pedido, com cópia de nome e preço no momento do envio. |
| `payment` | Registro manual de pagamento de uma conta. |
| `orderEvent` | Histórico de mudanças de status de um pedido. |
| `counter` | Contador sequencial por estabelecimento, usado na senha de retirada. |

## Enumerações

| Campo | Valores | Significado |
| --- | --- | --- |
| `user.role` | `MANAGER`, `STAFF` | Gerente (cardápio, equipe, mesas, relatórios) e funcionário (fila da cozinha, pedidos, entregas) |
| `bill.type` | `TABLE`, `COUNTER` | Conta de mesa ou de balcão |
| `bill.status` | `OPEN`, `CLOSED` | Conta aberta recebe pedidos; fechada não recebe mais nada |
| `order.status` | `RECEIVED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELED` | Etapas do pedido na cozinha, as mesmas da barra de progresso do cliente |
| `payment.method` | `PIX`, `CASH`, `CARD` | Forma de pagamento registrada manualmente |

Transições válidas de `order.status`:

```text
RECEIVED ──▶ PREPARING ──▶ READY ──▶ DELIVERED
    │            │
    └────────────┴──▶ CANCELED
```

Um pedido `READY` ou `DELIVERED` não volta atrás nem é cancelado. Cada transição grava um documento em `orderEvent`.

## Campos

Campos comuns a todas as coleções: `_id`, `createdAt`, `updatedAt`. A coleção `tenant` não tem `tenantId`; o seu `_id` é o próprio `tenantId` das demais. As tabelas abaixo não repetem esses campos.

### tenant

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `slug` | string | Identificador público e único na URL do estabelecimento |
| `name` | string | Nome exibido |
| `active` | boolean | Estabelecimento inativo não abre cardápio nem login |
| `branding.logoUrl` | string | Logotipo exibido no cardápio e no painel; opcional |
| `branding.primaryColor` | string | Cor primária do tema, em hexadecimal (`#111111`) |
| `settings.tableService` | boolean | Aceita conta de mesa |
| `settings.counterService` | boolean | Aceita conta de balcão, com senha de retirada |
| `settings.requireCustomerName` | boolean | Pede o nome do cliente antes de abrir a conta |
| `settings.requireCustomerPhone` | boolean | Pede o telefone do cliente antes de abrir a conta |

### user

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `name` | string | Nome do usuário |
| `email` | string | E-mail de login, sempre em minúsculas; único por estabelecimento |
| `passwordHash` | string | Hash BCrypt da senha, gerado pelo `backend/`. A senha em texto nunca chega ao `server/` |
| `role` | string | `MANAGER` ou `STAFF` |
| `active` | boolean | Usuário inativo não consegue entrar |
| `lastLoginAt` | date | Último login; ausente se nunca entrou |

O perfil escolhido na tela de login só decide a tela de destino. O `backend/` compara com `role` e recusa o acesso quando não batem.

### table

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `tableNumber` | int | Número da mesa, único por estabelecimento; vai no link do QR code |
| `active` | boolean | Mesa inativa não abre conta |

### category

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `name` | string | Nome da categoria |
| `active` | boolean | Categorias inativas não aparecem no cardápio |
| `sortOrder` | int | Ordem de exibição |

### product

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `categoryId` | ObjectId | Categoria do produto |
| `name` | string | Nome do produto |
| `description` | string | Descrição exibida no cardápio |
| `priceCents` | int | Preço em centavos |
| `imageUrl` | string | Foto do produto; opcional |
| `available` | boolean | Produtos indisponíveis não aparecem no cardápio |
| `sortOrder` | int | Ordem de exibição dentro da categoria |

### customerSession

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `customerName` | string | Nome informado pelo cliente |
| `customerPhone` | string | Telefone informado pelo cliente; opcional conforme `settings.requireCustomerPhone` |
| `tableNumber` | int | Mesa do QR code lido; ausente quando entrou pelo balcão |
| `billId` | ObjectId | Conta aberta por esta sessão; ausente até abrir |
| `lastSeenAt` | date | Última requisição do cliente |

### bill

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `type` | string | `TABLE` ou `COUNTER` |
| `tableNumber` | int | Mesa da conta; ausente na conta de balcão |
| `customerSessionId` | ObjectId | Sessão do cliente dono da conta |
| `customerName` | string | Nome do cliente dono da conta, copiado da sessão |
| `status` | string | `OPEN` ou `CLOSED` |
| `totalCents` | int | Soma dos pedidos não cancelados, em centavos |
| `paidCents` | int | Soma dos pagamentos registrados, em centavos |
| `openedAt` | date | Abertura |
| `closedAt` | date | Fechamento; ausente enquanto aberta |
| `closedByUserId` | ObjectId | Usuário que fechou a conta; ausente enquanto aberta |
| `pickupTicket` | int | Senha de retirada, vinda de `counter`; só na conta de balcão |

Uma mesa pode ter várias contas `OPEN` ao mesmo tempo, uma por pessoa.

### order

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `billId` | ObjectId | Conta do pedido |
| `orderNumber` | int | Número exibido ao cliente e na cozinha, vindo de `counter` |
| `tableNumber` | int | Cópia de `bill.tableNumber`, para a fila da cozinha não precisar buscar a conta |
| `pickupTicket` | int | Cópia de `bill.pickupTicket` na conta de balcão |
| `customerName` | string | Cópia de `bill.customerName` |
| `status` | string | Estado do pedido na cozinha |
| `totalCents` | int | Total do pedido em centavos |
| `itemCount` | int | Quantidade total de unidades no pedido |
| `sentAt` | date | Envio pelo cliente |
| `readyAt` | date | Momento em que ficou `READY`; usado no aviso de pedido pronto |
| `deliveredAt` | date | Momento em que ficou `DELIVERED` |

### orderItem

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `orderId` | ObjectId | Pedido |
| `billId` | ObjectId | Conta, repetida para somar a conta sem passar pelo pedido |
| `productId` | ObjectId | Produto de origem |
| `productName` | string | Nome do produto no momento do envio |
| `unitPriceCents` | int | Preço unitário no momento do envio |
| `quantity` | int | Quantidade, no mínimo 1 |
| `notes` | string | Observação do cliente ("sem cebola"); opcional |
| `subtotalCents` | int | `unitPriceCents × quantity` |

Nome e preço são copiados porque o produto pode mudar ou sair do cardápio depois do pedido.

### payment

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `billId` | ObjectId | Conta paga |
| `method` | string | `PIX`, `CASH` ou `CARD` |
| `amountCents` | int | Valor recebido, em centavos |
| `receivedByUserId` | ObjectId | Usuário da equipe que registrou |
| `paidAt` | date | Momento do registro |

Uma conta pode ter mais de um pagamento (parte em pix, parte em dinheiro). A conta só fecha quando `paidCents` alcança `totalCents`.

### orderEvent

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `orderId` | ObjectId | Pedido |
| `fromStatus` | string | Status anterior; ausente no evento de criação |
| `toStatus` | string | Novo status |
| `userId` | ObjectId | Usuário da equipe que mudou; ausente quando foi o cliente (criação) |
| `at` | date | Momento da mudança |

`orderEvent` só recebe inserções; nada é alterado nem apagado.

### counter

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `name` | string | Nome da sequência, com a data do dia em UTC: `pickupTicket:2026-10-23`, `orderNumber:2026-10-23` |
| `seq` | int | Último valor entregue |

O próximo valor sai de um `findOneAndUpdate` com `$inc: { seq: 1 }`, `upsert: true` e retorno do documento depois da alteração. Como o nome leva a data, senhas e números de pedido recomeçam em 1 a cada dia.

## Relacionamentos

```text
tenant ─┬─< user
        ├─< table
        ├─< category ──< product
        ├─< customerSession ──o bill
        ├─< bill ─┬─< order ─┬─< orderItem >── product
        │         │          └─< orderEvent
        │         └─< payment
        └─< counter
```

- Todas as coleções apontam para `tenant` por `tenantId`.
- `product.categoryId` aponta para `category`.
- `customerSession.billId` e `bill.customerSessionId` ligam a sessão à conta.
- `order.billId` aponta para `bill`.
- `orderItem.orderId` aponta para `order`; `orderItem.billId` para `bill`; `orderItem.productId` para `product`.
- `orderEvent.orderId` aponta para `order`.
- `payment.billId` aponta para `bill`.
- `user` aparece em `bill.closedByUserId`, `payment.receivedByUserId` e `orderEvent.userId`.

## Índices e restrições

| Coleção | Índice | Tipo | Uso |
| --- | --- | --- | --- |
| `tenant` | `{ slug: 1 }` | único | `TENANT_GET`, `MENU_LIST` |
| `user` | `{ tenantId: 1, email: 1 }` | único | `USER_BY_EMAIL` |
| `table` | `{ tenantId: 1, tableNumber: 1 }` | único | `TABLE_LIST`, abertura de conta pela mesa |
| `category` | `{ tenantId: 1, active: 1, sortOrder: 1 }` | | `MENU_LIST` |
| `product` | `{ tenantId: 1, available: 1, sortOrder: 1 }` | | `MENU_LIST` |
| `product` | `{ tenantId: 1, categoryId: 1 }` | | Produtos de uma categoria no painel |
| `customerSession` | `{ tenantId: 1, lastSeenAt: 1 }` | | Limpeza de sessões antigas |
| `bill` | `{ tenantId: 1, status: 1, tableNumber: 1 }` | | `BILL_LIST`, contas abertas por mesa |
| `bill` | `{ tenantId: 1, openedAt: -1 }` | | `REPORT_SUMMARY` |
| `order` | `{ tenantId: 1, status: 1, sentAt: 1 }` | | `ORDER_QUEUE`, fila da cozinha em ordem de chegada |
| `order` | `{ tenantId: 1, billId: 1 }` | | Pedidos de uma conta |
| `orderItem` | `{ tenantId: 1, orderId: 1 }` | | Itens de um pedido |
| `orderItem` | `{ tenantId: 1, billId: 1 }` | | Itens de uma conta |
| `payment` | `{ tenantId: 1, billId: 1 }` | | Pagamentos de uma conta |
| `payment` | `{ tenantId: 1, paidAt: -1 }` | | `REPORT_SUMMARY` |
| `orderEvent` | `{ tenantId: 1, orderId: 1, at: 1 }` | | Histórico de um pedido |
| `counter` | `{ tenantId: 1, name: 1 }` | único | `TICKET_NEXT` |

Toda coleção tem um validador `$jsonSchema` com os campos obrigatórios, os tipos e os valores aceitos nas enumerações. O validador está no `init-db.js` e usa `validationLevel: "strict"`.

## Criando o banco

O script roda no `mongosh`, tanto no MongoDB local quanto no Atlas:

```bash
mongosh "$MONGODB_URI" server/scripts/init-db.js
```

Ele é idempotente: pode rodar de novo sem duplicar nada. Cria as coleções que faltam, atualiza os validadores, cria os índices e, se o slug `demo` não existir, insere o estabelecimento de demonstração:

| Dado | Valor |
| --- | --- |
| Estabelecimento | `demo` (Bar do Demo) |
| Gerente | `gerente@demo.com`, senha `pedeai123` |
| Funcionário | `funcionario@demo.com`, senha `pedeai123` |
| Mesas | 1 a 10 |
| Cardápio | Lanches, Pratos, Bebidas e Sobremesas, com os produtos do protótipo |

As senhas de demonstração servem só para desenvolvimento. Nunca rode o seed num banco de produção.
