# Arquitetura

> **Aviso:** este documento está em construção. O restante do conteúdo entra nos cards PA-012 e PA-013.

## Visão geral

O sistema tem três processos:

```text
frontend ──HTTP──▶ backend ──socket TCP──▶ server ──▶ MongoDB
:3000              :8080                   :5000
```

| Processo | Pasta | Tecnologia | Papel |
| --- | --- | --- | --- |
| Frontend | `frontend/` | React 18, TypeScript, Rsbuild | Interface do cliente e do painel |
| Backend | `backend/` | Java 17, Spring Boot 3 | Expõe HTTP para o front, valida e autentica. Não acessa o banco |
| Server | `server/` | Java 17 puro | Escuta um socket TCP e é o único que fala com o MongoDB |

## Regra de acesso ao banco

**Só o `server/` acessa o banco.** O `backend/` não tem o driver do MongoDB nem repositórios: toda leitura e escrita passa por um comando do protocolo descrito em `docs/protocolo.md`. A dependência `mongodb-driver-sync` é a única do `server/`.

Toda consulta do `server/` filtra por `tenantId`. Os repositórios herdam de `BaseRepository`, cujos métodos de busca exigem o `tenantId`.

## Backend

Pacote raiz `br.puccampinas.pedeai`. Os subpacotes de negócio são `menu`, `bill`, `tenant`, `table`, `payment`, `order`, `report` e `user`. `common` guarda o tratamento de erros e o `/health`, `config` guarda segurança e CORS, e `socket` guarda o cliente do protocolo (`SocketClient` e `SocketResponse`, timeout de 3 segundos).

## Server

Pacote raiz `br.puccampinas.pedeai.server`:

| Pacote | Conteúdo |
| --- | --- |
| `protocol` | Comandos, leitura da linha, JSON e o `ConnectionHandler` |
| `repository` | Acesso às coleções, sempre com `tenantId` |
| `service` | Regra de cada comando |
| `infra` | Conexão com o MongoDB, configuração e o `SocketServer` |

O `SocketServer` aceita conexões em laço e entrega cada uma a uma thread de um pool fixo. Não há bibliotecas além do driver do MongoDB: o JSON é montado e lido por uma classe própria.

## Frontend

React com Material UI. O tema recebe a cor primária por uma variável, para o whitelabel trocar em tempo de execução. O cliente HTTP único fica em `frontend/src/services/api.ts`.

## Whitelabel

## Implantação
