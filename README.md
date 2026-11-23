# Pede Aí

Comanda digital para bares, restaurantes e cafeterias. O cliente lê um QR code na mesa, monta a própria comanda pelo celular e o pedido cai direto na tela da cozinha. No balcão, o mesmo celular funciona como senha de retirada.

O sistema é whitelabel: cada estabelecimento usa a plataforma com o próprio nome, logotipo e cores, e configura o comportamento (mesa, balcão, identificação do cliente) sem precisar de alteração no código.

Projeto Integrador IV, Engenharia de Software, PUC-Campinas. Professora Renata Antonia Tadeu Arantes.

## Equipe

- **Pedro Henrique Bonetto da Costa** - [@PresetyX](https://github.com/PresetyX)
- **Bruno Terra Silverio** - [@brUnoterraA](https://github.com/brUnoterraA)
- **Pedro Henrique Medeiros dos Reis** - [@phzmedeiros](https://github.com/phzmedeiros)
- **Vitor Hugo Gilberti** - [@Vitor121205](https://github.com/Vitor121205)
- **Mateus Souza Marinho** - [@matiazzsouza](https://github.com/matiazzsouza)

Todos trabalham nos três processos: server, backend e frontend. A divisão por card está na aba Cards da planilha de backlog e no GitHub Projects.

## Escopo do semestre

Seis módulos entram nesta versão:

| Módulo | O que cobre |
| --- | --- |
| Acesso e identificação | Entrada por QR code ou link, cadastro mínimo do cliente, login e perfis da equipe |
| Cardápio | Categorias, produtos, preço, disponibilidade e ordenação |
| Conta e comanda | Conta por pessoa, várias contas na mesma mesa e conta de balcão |
| Pedido | Carrinho, observação por item, envio e cálculo de total |
| Produção e salão | Fila da cozinha, mudança de status, mesas e entrega |
| Fechamento e retirada | Registro manual de pagamento, senha de retirada e aviso de pedido pronto |

Fora do escopo desta versão: confirmação automática de pagamento por gateway, controle de estoque, divisão de uma mesma conta entre pessoas, notificação push, delivery, nota fiscal e programa de fidelidade.

## Stack

### Backend (`backend/`)

- **Java 17** com **Spring Boot 3.2** (Spring Web, Spring Data MongoDB, Spring Security com JWT e Validation)
- Expõe HTTP para o front e acessa o MongoDB com Spring Data
- Consulta o `server/` por socket para validar cada pedido antes de aceitá-lo
- Build com **Maven**

### Server (`server/`)

- **Java 17** puro, socket TCP na porta 5000, sem dependências (o JUnit 5 entra só nos testes)
- Não acessa o banco: só valida, por socket, o que o `backend/` pede (comandos `PING` e `VALIDATE_ORDER`)
- Build com **Maven**

### Banco de dados

- **MongoDB 7**: local, pelo Docker Compose, ou no **MongoDB Atlas** (cluster M0 gratuito)

### Frontend (`frontend/`)

- **React 18** com **TypeScript**
- Build com **Rsbuild** (Rspack)
- **Material UI** como biblioteca de componentes, com tema carregado da configuração do estabelecimento

### Pagamentos

- **Registro manual** da forma de pagamento: pix manual, dinheiro ou cartão
- Integração com gateway em sandbox fica como extensão, fora desta versão

## Estrutura do projeto

```
PI_IV-Time-5/
├── server/           # Java puro, socket TCP de validação, sem acesso ao banco
│   ├── src/main/java/br/puccampinas/pedeai/server/
│   └── pom.xml
├── backend/          # API HTTP em Java com Spring Boot e Spring Data MongoDB
│   ├── src/main/java/br/puccampinas/pedeai/
│   └── pom.xml
├── frontend/         # Aplicação React com Rsbuild
│   ├── src/
│   └── package.json
├── banco/            # Scripts do MongoDB: init-mongo.js (coleções e índices) e seed.js (dados de exemplo)
├── docs/             # Ideação, dicionário de dados, arquitetura, contratos e protocolo do socket
└── README.md
```

Fluxo de uma requisição: `frontend` chama `backend` por HTTP, `backend` lê e grava no MongoDB e, antes de aceitar pedido e pagamento, pede a validação ao `server` por socket.

## Como rodar

### Com Docker


Pré-requisitos: Docker com Compose v2 e JDK 17 com Maven 3.9 (o server de socket roda fora do Docker).

**1. Server de socket, no terminal (sempre primeiro):**

```bash
mvn -f server/pom.xml compile exec:java
```

Ele escuta na porta 5000 e mostra uma linha por requisição recebida, por exemplo `VALIDATE_ORDER de 172.17.0.3 -> OK (3 ms)`. Para parar, `Ctrl+C`.

**2. O resto, em outro terminal:**

```bash
cp .env.example .env
```

Preencha `JWT_SECRET` no `.env` da raiz com uma chave de pelo menos 32 caracteres. Depois:

```bash
docker compose up --build
```

Sobem o MongoDB local, o backend e o frontend. O backend acessa o server da sua máquina por `host.docker.internal:5000`. Se o server estiver desligado, o resto sobe normalmente, o `/health` responde 503 e todo pedido é recusado ("não conseguimos conferir seu pedido") até o server voltar; não é preciso reiniciar o Docker. Na primeira subida, o serviço `db-init` cria as coleções com `banco/init-mongo.js` e carrega a casa `triunfo-lanches` com `banco/seed.js`. Nas próximas, o seed é pulado e os dados continuam no volume `mongo-data`.

| Serviço | Endereço |
| --- | --- |
| Site e aplicação | `http://localhost:3000` |
| Backend | `http://localhost:8080/health` |
| Server de socket (no terminal) | `localhost:5000` |
| MongoDB | `mongodb://localhost:27017/pedeai` |

Login da equipe na casa de demonstração: qualquer usuário do `banco/seed.js` com a senha `pedeai123`.

Para usar o Atlas em vez do Mongo local, coloque a string de conexão em `MONGODB_URI` no `.env` da raiz. Para zerar o banco local: `docker compose down -v`.

### Sem Docker

Pré-requisitos: JDK 17 ou superior, Maven 3.9 ou superior, Node 20 ou superior e acesso a um MongoDB (Atlas ou local).

### 1. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com os valores reais. O arquivo `.env` nunca vai para o repositório.

```bash
cp server/.env.example server/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Como cada processo lê as variáveis:

- **`backend/`** lê o `backend/.env` sozinho, pela dependência `spring-dotenv`. O arquivo é procurado no diretório de trabalho do processo: `mvn -f backend/pom.xml spring-boot:run` já usa a pasta `backend/`; na IDE, configure o diretório de trabalho da execução como `backend/`.
- **Prioridade no backend:** uma variável de ambiente definida no terminal, na IDE ou no servidor vence o valor do `backend/.env`. Assim dá para sobrescrever um valor só, por exemplo `JWT_SECRET=... mvn -f backend/pom.xml spring-boot:run`, sem editar o arquivo.
- **`server/`** é Java puro e não lê `.env`: exporte `SOCKET_PORT` no terminal ou deixe o padrão 5000.
- **`frontend/`** lê o `frontend/.env` pelo Rsbuild.

`server/.env.example`:

```
SOCKET_PORT=5000
```

`backend/.env.example`:

```
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/pedeai
SOCKET_HOST=localhost
SOCKET_PORT=5000
JWT_SECRET=troque-por-uma-chave-com-pelo-menos-32-caracteres
JWT_EXPIRATION_MINUTES=480
CORS_ORIGINS=http://localhost:3000
```

`frontend/.env.example`:

```
PUBLIC_API_URL=http://localhost:8080
```

A string de conexão real fica no grupo, não no repositório.

### 2. Server (primeiro)

```bash
mvn -f server/pom.xml compile exec:java
```

O server escuta na porta de `SOCKET_PORT` (padrão 5000). Para testar sem o backend, use o cliente de terminal em outro terminal:

```bash
java -cp server/target/classes br.puccampinas.pedeai.server.TestClient "PING"
```

O protocolo está em `docs/protocolo.md`.

### 3. Backend (segundo)

```bash
mvn -f backend/pom.xml spring-boot:run
```

Confira em `http://localhost:8080/health`. A resposta mostra o estado do server (pelo socket) e do banco (pelo Spring Data). Se qualquer um dos dois estiver fora, a resposta é 503.

### 4. Frontend (terceiro)

```bash
cd frontend
npm install
npm run dev
```

A aplicação sobe em `http://localhost:3000` e consome o backend pelo endereço do `.env`.

### 5. Dados de exemplo

Com o `mongosh` instalado, crie as coleções e os índices e depois carregue a casa de demonstração `triunfo-lanches`:

```bash
mongosh "<string de conexao>" banco/init-mongo.js
mongosh "<string de conexao>" banco/seed.js
```

O menu da casa fica em `GET /api/public/stores/triunfo-lanches/menu`.

### Acesso à demonstração

| Quem | Onde | Login |
| --- | --- | --- |
| Cliente na mesa | `http://localhost:3000/t/triunfo-lanches/<token da mesa>` (o token sai no fim do `seed.js`) | nome e celular |
| Cliente no balcão | `http://localhost:3000/t/triunfo-lanches/balcao` | nome e celular |
| Painel de senhas | `http://localhost:3000/t/triunfo-lanches/painel` | — |
| Equipe | `http://localhost:3000/login` | `marcos@` (dono), `paula@` (gerente), `rafa@` (garçom) ou `ze@triunfolanches.com` (cozinha), senha `pedeai123` |

## Testes

| Processo | Comando | Testes |
| --- | --- | --- |
| Backend | `mvn -f backend/pom.xml test` | 172 testes de unidade (JUnit 5 e Mockito) |
| Server | `mvn -f server/pom.xml test` | 57 testes: intraclasse do `OrderValidator`, `SocketServer` e `Request`, e interclasse do `VALIDATE_ORDER` pelo socket |
| Frontend | `cd frontend && npm run build` | checagem de tipos do TypeScript e build |

Os três rodam no GitHub Actions a cada pull request.

## Convenções

Estas regras valem para todo o código e evitam retrabalho:

- **Só o `backend/` acessa o banco.** O `server/` não tem driver nem conexão: ele só valida o que o backend envia pelo socket.
- **Multiempresa.** Toda coleção, exceto `store`, tem `storeId` e toda consulta filtra por ele. Nenhuma exceção.
- **Código em inglês.** Pastas, pacotes, classes, métodos, variáveis, coleções e campos são em inglês. README e `docs/` ficam em português.
- **Dinheiro em centavos**, sempre como inteiro. `3200` é R$ 32,00. Nada de ponto flutuante em valor.
- **Datas em UTC** no banco, convertidas para o fuso da casa na exibição.
- **Cópia de nome e preço** no item do pedido. Mudança no cardápio não altera pedido já enviado.
- **Erro da API** sempre no formato `{ "error": "error_code", "message": "texto para a tela" }`.
- **Segredo nenhum no repositório.** Variável nova entra também no `.env.example`.

## Fluxo de trabalho

- Branch por tarefa, a partir da `main`: `feat/cardapio`, `fix/total-da-conta`.
- Mensagem de commit em português e no imperativo: `adiciona endpoint de cardapio`.
- Entrada na `main` apenas por pull request, com aprovação de outro integrante.
- O pull request cita o card correspondente do GitHub Projects.

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| `docs/ideacao/apresentacao-da-ideia.pdf` | Documento de ideação: problema, proposta, funcionamento, módulos e diferenciais |
| `docs/contratos.md` | Rotas da API, entrada, saída e códigos de erro |
| `docs/dicionario-de-dados.md` | Dicionário de dados do MongoDB: coleções, campos, tipos, relacionamentos e índices |
| `docs/arquitetura.md` | Os três processos, camadas, pastas e decisões técnicas com justificativa |
| `docs/protocolo.md` | Protocolo de texto do socket entre `backend/` e `server/`, comandos e exemplos |

## GitHub Projects

O quadro de tarefas fica em [Projects deste repositório](https://github.com/PresetyX/PI_IV-Time-5/projects).

Campos usados em cada card: Status (A fazer, Fazendo, Em revisão, Feito), Etapa, Frente (back, front, banco, teste, documentação, infra), Pontos e Responsável.

## Cronograma

As etapas abaixo são as que aconteceram, com as datas tiradas dos documentos de ideação e dos pull requests deste repositório.

| Período | Etapa | O que foi entregue |
| --- | --- | --- |
| 31/08 a 16/09 | Ideação | Apresentação da ideia, mapa mental, Business Model Canvas, mapa da empatia, matriz SWOT, protótipo e pitch |
| 29/09 a 26/10 | Fundação | Repositório, backlog, modelo de dados e script do banco, arquitetura, protocolo do socket e base dos três processos |
| 27/10 a 29/10 | Cliente, operação e gestão | Entrada pelo QR, sessão do cliente, comandas e conta, telas da cozinha e do salão, painel de gestão, Docker e site institucional |
| 05/11 a 07/11 | Pedido e fechamento | Pedido pronto, chamar o garçom, mais uma rodada, cancelamento e entrega parcial, balcão com senha, comanda compartilhada e Pix |
| 11/11 a 19/11 | Cardápio e demonstração | Cardápio no painel, cardápio interativo do cliente e casa de demonstração |
| 21/11 a 23/11 | Qualidade e entrega | Servidor de validação sem Spring, testes do servidor, autoria e comentários no código, validação do celular, dicionário de dados e release `v1.0.0` |
| 24/11 | Banca | Apresentação do projeto |

## Licença

Projeto acadêmico desenvolvido para a disciplina de Projeto Integrador IV.

---

**Status:** versão 1.0.0, apresentada à banca em 24/11/2026.
