# Modelo de dados

> **Aviso:** o conteúdo deste documento é descrito em português, mas todos os identificadores (coleções e campos) são em inglês. A versão completa entra nos cards PA-012 e PA-013.

## Visão geral

O banco é o MongoDB, database `pedeai`. Somente o processo `server/` acessa o banco. Toda coleção, exceto `tenant`, tem o campo `tenantId`, e toda consulta filtra por ele.

Convenções:

- Identificadores de coleção no singular e em minúsculas: `tenant`, `bill`, `order`.
- Campos em camelCase.
- Dinheiro em centavos, sempre inteiro (`priceCents`, `totalCents`).
- Datas em UTC.

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

## Campos

Campos comuns a todas as coleções: `_id`, `createdAt`, `updatedAt`. A coleção `tenant` não tem `tenantId`; o seu `_id` é o próprio `tenantId` das demais.

### tenant

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `slug` | string | Identificador público e único na URL do estabelecimento |
| `name` | string | Nome exibido |

### table

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `tableNumber` | int | Número da mesa |

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
| `available` | boolean | Produtos indisponíveis não aparecem no cardápio |
| `sortOrder` | int | Ordem de exibição dentro da categoria |

### customerSession

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `customerName` | string | Nome informado pelo cliente |
| `customerPhone` | string | Telefone informado pelo cliente |

### bill

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `tableNumber` | int | Mesa da conta; ausente na conta de balcão |
| `customerName` | string | Nome do cliente dono da conta |
| `status` | string | Estado da conta (aberta ou fechada) |
| `totalCents` | int | Total da conta em centavos |
| `openedAt` | date | Abertura |
| `closedAt` | date | Fechamento; ausente enquanto aberta |
| `pickupTicket` | int | Senha de retirada, vinda de `counter` |

### order

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `tenantId` | ObjectId | Estabelecimento |
| `billId` | ObjectId | Conta do pedido |
| `status` | string | Estado do pedido na cozinha |
| `totalCents` | int | Total do pedido em centavos |

### Demais coleções

`user`, `orderItem`, `payment`, `orderEvent` e `counter` têm a estrutura detalhada nos cards PA-012 e PA-013. Todas seguem as convenções acima e carregam `tenantId`.

## Relacionamentos

- `category`, `product`, `table`, `user`, `bill`, `order` e as demais apontam para `tenant` por `tenantId`.
- `product.categoryId` aponta para `category`.
- `order.billId` aponta para `bill`.

## Índices e restrições

- `tenant.slug` único.
- Índice composto com `tenantId` como primeiro campo em toda coleção consultada por estabelecimento.
