# Arquitetura

> **Aviso:** este documento está em construção. O restante do conteúdo entra nos cards PA-012 e PA-013.

## Visão geral

O sistema tem três processos e um banco:

```text
frontend ──HTTP──▶ backend ──Spring Data──▶ MongoDB
:3000              :8080 │
                         └──socket TCP──▶ server
                                          :5000
```

| Processo | Pasta | Tecnologia | Papel |
| --- | --- | --- | --- |
| Frontend | `frontend/` | React 18, TypeScript, Rsbuild | Interface do cliente e do painel |
| Backend | `backend/` | Java 17, Spring Boot 3, Spring Data MongoDB | Expõe HTTP, autentica e é o único que acessa o banco |
| Server | `server/` | Java 17 puro | Escuta um socket TCP e valida pedido e pagamento antes de o backend aceitá-los |

## Regra de acesso ao banco

**Só o `backend/` acessa o banco.** O `server/` não tem driver do MongoDB, conexão nem repositórios: ele recebe os dados pelo socket, valida e responde. Não há dependências no `server/`.

Os nomes das coleções são os de `banco/init-mongo.js`. Toda coleção, exceto `store`, tem `storeId`, e toda consulta do `backend/` filtra por ele. Dinheiro é inteiro em centavos e datas ficam em UTC.

## Backend

Pacote raiz `br.puccampinas.pedeai`.

| Pacote | Conteúdo |
| --- | --- |
| `store` | Documento `Store` e seu repositório |
| `menu` | Documentos `Category` e `Product`, repositórios, `MenuService` e o endpoint público do cardápio |
| `user` | Documento `User` e seu repositório |
| `bill`, `order`, `payment`, `report`, `table` | Ainda vazios |
| `common` | Tratamento de erros e o `/health` |
| `config` | Segurança, CORS e timeout do cliente do MongoDB |
| `socket` | Cliente do protocolo (`SocketClient` e `SocketResponse`, timeout de 3 segundos) |

## Server

Pacote raiz `br.puccampinas.pedeai.server`:

| Pacote | Conteúdo |
| --- | --- |
| `protocol` | Comandos, leitura da linha, JSON e o `ConnectionHandler` |
| `service` | `OrderValidator`, a regra do `VALIDATE_ORDER` |
| `infra` | Configuração e o `SocketServer` |

O `SocketServer` aceita conexões em laço e entrega cada uma a uma thread de um pool fixo. O JSON é montado e lido por uma classe própria. O protocolo está em `docs/protocolo.md`.

## Frontend

React com Material UI. O tema recebe a cor primária por uma variável, para o whitelabel trocar em tempo de execução. O cliente HTTP único fica em `frontend/src/services/api.ts`.

## Whitelabel

## Implantação
