# Relatório do repositório

Estado do repositório em 26/10/2026, levantado do disco e do `git`.

## 1. Estrutura (3 níveis, sem `node_modules`, `target`, `dist` e `.git`)

```text
PI_IV-Time-5/
├── .github/
│   ├── modernize/java-upgrade/      (ignorada pelo próprio .gitignore interno)
│   └── workflows/                   backend.yml, frontend.yml, server.yml
├── .gitignore
├── .vscode/settings.json            (ignorada pelo .gitignore da raiz)
├── README.md
├── backend/
│   ├── .env.example, pom.xml
│   └── src/{main,test}
├── banco/                           (NÃO versionada: aparece como `??` no git)
│   ├── init-mongo.js
│   └── seed.js
├── docs/                            arquitetura.md, contratos.md, modelo.md, protocolo.md
├── frontend/
│   ├── .env.example, package.json, package-lock.json, rsbuild.config.ts, tsconfig.json
│   └── src/{App.tsx, env.d.ts, index.tsx, components, pages, services, theme}
└── server/
    ├── .env.example, pom.xml
    └── src/main
```

## 2. O que existe em cada pasta

| Pasta | Existe de verdade | Só esqueleto | Não existe |
| --- | --- | --- | --- |
| `server/` | Socket TCP, protocolo, 3 comandos, conexão com o Mongo, 3 repositórios, 2 serviços, `TestClient` | 12 comandos declarados no enum, sem implementação | Testes, logging configurado, `Dockerfile` |
| `backend/` | Cliente de socket, `/health`, rota do menu, segurança, CORS, tratamento de erros | Pacotes `bill`, `order`, `payment`, `report`, `table`, `tenant`, `user` (só `.gitkeep`). 1 teste que só instancia a classe | Login e JWT (a chave `jwt.secret` existe, nenhuma classe a usa), acesso ao banco |
| `frontend/` | 2 páginas de exemplo, rotas, cliente HTTP, provedor de tema | `components/` (só `.gitkeep`) | Testes, lint, telas de negócio, uso de `saveToken` |
| `banco/` | `init-mongo.js` e `seed.js` | — | Versionamento (arquivos não commitados) |
| `docs/` | `protocolo.md`, `arquitetura.md` e `modelo.md` parciais | `contratos.md` (só títulos), seções "Whitelabel" e "Implantação" em `arquitetura.md` | — |
| `.github/` | 3 workflows | — | — |

## 3. Backend

- **Versões:** Java 17 (`java.version`), Spring Boot 3.2.5 (parent `spring-boot-starter-parent`).
- **Dependências:**
  - `spring-boot-starter-web`
  - `spring-boot-starter-validation`
  - `spring-boot-starter-security`
  - `spring-boot-starter-test` (escopo test)
- **Classes** (pacote raiz `br.puccampinas.pedeai`):

| Classe | Pacote | Responsabilidade |
| --- | --- | --- |
| `PedeAiApplication` | raiz | Classe principal do Spring Boot |
| `HealthController` | `common` | `/health`: manda `PING` ao socket e devolve estado do server e do banco |
| `GlobalExceptionHandler` | `common` | Converte exceções em `{error, message}` (400, 404, 409, 502, 503) |
| `ErrorResponse` | `common` | Record do formato de erro |
| `ResourceNotFoundException` | `common` | Exceção que vira 404 |
| `ConflictException` | `common` | Exceção que vira 409 |
| `ServerUnavailableException` | `common` | Server inalcançável, vira 503 |
| `UpstreamErrorException` | `common` | Erro devolvido pelo server, vira 502 |
| `CorsConfig` | `config` | Bean de CORS lendo `cors.origins` |
| `SecurityConfig` | `config` | Stateless, sem CSRF, login form ou basic; libera `/health` e `/api/public/**`; o resto devolve 401 |
| `MenuController` | `menu` | Chama `MENU_LIST` pelo socket e devolve o JSON |
| `SocketClient` | `socket` | Abre conexão TCP, envia uma linha, lê a resposta, timeout de 3 s |
| `SocketResponse` | `socket` | Resposta `OK`/`ERROR` já parseada |
| `PedeAiApplicationTests` | test | Instancia a classe principal |

- **Endpoints:**
  - `GET /health`
  - `GET /api/public/tenants/{slug}/menu`
- **Conexão com o MongoDB:** o backend não tem conexão. A única configuração de banco está no `server`: `server/src/main/java/.../infra/Settings.java` lê `MONGODB_URI`, com padrão `mongodb://localhost:27017`. O nome do banco `pedeai` está fixo em `MongoConnection.DATABASE_NAME`.
- **`backend/src/main/resources/application.properties`:** `socket.host`, `socket.port`, `jwt.secret`, `jwt.expirationMinutes` e `cors.origins`, todas vindas de variáveis de ambiente.

## 4. Server

- **Pom:** Java 17, única dependência `org.mongodb:mongodb-driver-sync:4.11.2`, plugin `exec-maven-plugin`.
- **Classes** (pacote `br.puccampinas.pedeai.server`):

| Classe | Pacote | Responsabilidade |
| --- | --- | --- |
| `ServerApplication` | raiz | `main`: monta repositórios, serviços e socket |
| `TestClient` | raiz | Cliente de terminal (modo interativo ou um argumento) |
| `Settings` | `infra` | Lê `MONGODB_URI` e `SOCKET_PORT` do ambiente |
| `MongoConnection` | `infra` | Cliente Mongo único, banco `pedeai`, timeout de seleção de 2 s |
| `SocketServer` | `infra` | `ServerSocket`, laço de `accept`, pool fixo de 16 threads |
| `ConnectionHandler` | `protocol` | Lê uma linha (máx. 8192 caracteres), despacha, responde e fecha |
| `Protocol` | `protocol` | Parser da linha e montagem de `OK`/`ERROR` |
| `Request` | `protocol` | Comando mais parâmetros, com `require(key)` |
| `Command` | `protocol` | Enum de 15 comandos, com flag `implemented` |
| `CommandException` | `protocol` | Erro com código |
| `SimpleJson` | `protocol` | Escreve e lê JSON à mão |
| `BaseRepository` | `repository` | Buscas que exigem `tenantId` |
| `TenantRepository` | `repository` | Coleção `tenant`, busca por `slug` |
| `CategoryRepository` | `repository` | Coleção `category`, filtro `active=true`, ordem `sortOrder`, `name` |
| `ProductRepository` | `repository` | Coleção `product`, filtro `available=true`, ordem `sortOrder`, `name` |
| `Documents` | `service` | Converte `Document` em `Map` (`_id` vira `id`, `ObjectId` vira texto, `Date` vira ISO) |
| `TenantService` | `service` | `getBySlug` |
| `MenuService` | `service` | Monta o menu: tenant, categorias ativas e produtos disponíveis |

- **Socket:** implementado. A porta é `SOCKET_PORT`, com padrão 5000. O timeout de leitura é de 10 s.
- **Protocolo no código:**
  - Requisição: `COMMAND|key=value|key=value`.
  - Escapes no valor: `\|`, `\\`, `\n`, `\r`.
  - Resposta de sucesso: `OK|json`. Resposta de erro: `ERROR|code|message`.
  - Uma requisição por conexão.
  - Comandos implementados: `PING`, `TENANT_GET` (`slug`), `MENU_LIST` (`tenant`, que é o slug).
  - Declarados com `implemented=false`: `PRODUCT_UPSERT`, `TABLE_LIST`, `BILL_OPEN`, `BILL_GET`, `BILL_LIST`, `BILL_CLOSE`, `ORDER_CREATE`, `ORDER_QUEUE`, `ORDER_STATUS`, `TICKET_NEXT`, `REPORT_SUMMARY`, `USER_BY_EMAIL`. Respondem `NOT_IMPLEMENTED`.
  - Códigos de erro usados: `EMPTY_REQUEST`, `UNKNOWN_COMMAND`, `INVALID_PARAM`, `MISSING_PARAM`, `NOT_FOUND`, `NOT_IMPLEMENTED`, `DATABASE_UNAVAILABLE`, `INTERNAL`.
- **Coleções e campos que o código consulta:** `tenant` (`slug`), `category` (`tenantId`, `active`, `sortOrder`, `name`), `product` (`tenantId`, `categoryId`, `available`, `sortOrder`, `name`, `description`, `priceCents`).

## 5. Frontend

- **Build:** Rsbuild `^1.0.0` com `@rsbuild/plugin-react`. Porta 3000. Título HTML "Pede Aí". O script `build` roda `tsc --noEmit && rsbuild build`.
- **Dependências:**
  - `react` e `react-dom` `^18.3.1`
  - `react-router-dom` `^6.23.1`
  - `@mui/material` `^5.15.20`
  - `@emotion/react` e `@emotion/styled`
  - dev: `typescript`, `@types/react`, `@types/react-dom`, `@rsbuild/core`, `@rsbuild/plugin-react`
- **Rotas:** `/` (`PublicPage`), `/dashboard` (`DashboardPage`), `*` (redireciona para `/`).
- **Componentes criados:** nenhum em `src/components/`. Existem `PublicPage`, `DashboardPage` e `AppThemeProvider` (em `theme/`).
- **Tema:**
  - `theme.ts` define `DEFAULT_PRIMARY_COLOR = '#d84315'` e `createAppTheme(cor)`, que só define `palette.primary.main`.
  - `AppThemeProvider` guarda a cor em estado e expõe `useTenantTheme()` com `changePrimaryColor`. Nenhum componente chama essa função hoje.
  - Não há arquivo de design tokens além disso.
- **`services/api.ts`:** `PUBLIC_API_URL`, com padrão `http://localhost:8080`. Envia `Authorization: Bearer` se houver token no `localStorage` (chave `pedeai.token`). Erros viram `ApiError(status, code, message)`.

## 6. Banco (arquivos não versionados)

**`banco/init-mongo.js`** (uso: `mongosh "<uri>" banco/init-mongo.js`). Cria ou atualiza o validador `$jsonSchema` (nível `moderate`) de 15 coleções:
`store`, `user`, `table`, `category`, `product`, `guestSession`, `tab`, `order`, `payment`, `commission`, `cashDay`, `orderEvent`, `tableChange`, `waitlist`, `sequence`.
Depois cria 24 índices, entre eles:

- `store.slug` único
- `user` por `storeId` e `email` único
- `table` por `storeId` e `number` único
- `table.token` único
- TTL em `guestSession.expiresAt`
- índices de consulta por `storeId` nas demais coleções

Pode ser executado de novo.

**`banco/seed.js`** (uso: `mongosh "<uri>" banco/seed.js`). Apaga os dados da loja de slug `triunfo-lanches` e recria:

- 1 `store`
- 4 `user` (OWNER, MANAGER, WAITER, KITCHEN)
- 11 `table`
- 4 `category`
- 12 `product`
- 1 `guestSession`
- 1 `tab` aberta
- 1 contador em `sequence`
- 1 `order` com 2 itens
- 1 `orderEvent`

Imprime o login `marcos@triunfolanches.com` e o token de uma mesa.

**Divergência verificável entre as peças** (apenas constatação):

| | Scripts em `banco/` | Código do `server/` e `docs/modelo.md` |
| --- | --- | --- |
| Coleção da casa | `store` | `tenant` |
| Chave de isolamento | `storeId` | `tenantId` |
| Conta | `tab` | `bill` |
| Sessão do cliente | `guestSession` | `customerSession` |
| Contador | `sequence` | `counter` |
| Ordem da categoria | `position` | `sortOrder` |
| Visibilidade da categoria | `visible` | `active` |

## 7. Docs e README

| Arquivo | Resumo |
| --- | --- |
| `README.md` | Apresentação, equipe, escopo, stack, estrutura, como rodar (server, backend, frontend), convenções, fluxo de trabalho, cronograma |
| `docs/arquitetura.md` | Os três processos, regra "só o server acessa o banco", pacotes; "Whitelabel" e "Implantação" vazias |
| `docs/contratos.md` | Só títulos de seção e o aviso dos cards PA-012 e PA-013 |
| `docs/modelo.md` | Coleções e campos com identificadores em inglês (`tenant`, `bill` e outros); 6 coleções detalhadas |
| `docs/protocolo.md` | Regras, formato, tabela de comandos, códigos de erro e exemplos do protocolo do socket |

O README, na seção "5. Dados de exemplo", diz que o script de carga ainda não existe. Já existe `banco/seed.js`, ainda sem commit.

## 8. Git

- **Branch:** `main`.
- **Últimos 10 commits:**

| Hash | Autor | Data | Mensagem |
| --- | --- | --- | --- |
| b8cfe7d | Pedro Henrique Medeiros dos Reis | 2026-10-14 | update: update readme |
| 61d4b5f | Pedro Henrique Medeiros dos Reis | 2026-10-14 | add: add configuration to spec project as oriented by teacher |
| e0378b3 | Pedro Henrique Medeiros dos Reis | 2026-10-13 | adiciona configuracao inicial do backend e do frontend |
| fd0b1f9 | Pedro Henrique Bonetto da Costa | 2026-09-30 | Update contributors list in README.md |
| f2560b6 | Pedro Henrique Bonetto da Costa | 2026-09-29 | Update README.md |
| 04cd4d3 | Pedro Henrique Bonetto da Costa | 2026-09-29 | Update README.md |
| 864e3bc | Pedro Henrique Bonetto da Costa | 2026-09-29 | Update team members in README |
| ddf6f6f | Pedro Henrique Bonetto da Costa | 2026-09-29 | Fix link format for Bruno Terra Silverio |
| 510589a | Pedro Henrique Bonetto da Costa | 2026-09-29 | Add Bruno Terra Silverio to team list |
| 81c638e | Pedro Henrique Bonetto da Costa | 2026-09-29 | docs: atualiza README com stack tecnológica (...) |

- **Arquivos modificados não commitados:** nenhum.
- **Não rastreados:** `banco/` (`init-mongo.js` e `seed.js`).
- **Ignorados, mas presentes no disco:** `.vscode/` e `.github/modernize/`.

## 9. `.gitignore` (completo)

```text
target/
*.class
node_modules/
dist/
.env
.env.*
!.env.example
.idea/
*.iml
.vscode/
.classpath
.project
.settings/
*.swp
.DS_Store
Thumbs.db
*.log
```

## 10. Riscos de credenciais

Nenhum arquivo `.env`, chave ou string de conexão real está versionado. Os três `.env.example` têm valores vazios. O que existe:

| Caminho:linha | O que há | Estado |
| --- | --- | --- |
| `banco/seed.js:5` | Senha em texto: `"pedeai123"` | Não versionado ainda |
| `banco/seed.js:9` | Hash BCrypt dessa senha | Não versionado ainda |
| `banco/seed.js:67` e `:188` | Imprimem a senha e o login `marcos@triunfolanches.com / pedeai123` | Não versionado ainda |
| `README.md:102` | `MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/pedeai` | Versionado, valor de exemplo |
| `README.md:111` | `JWT_SECRET=troque-esta-chave` | Versionado, valor de exemplo |
| `server/.../infra/Settings.java:5` | `mongodb://localhost:27017` como padrão | Versionado, sem usuário nem senha |
