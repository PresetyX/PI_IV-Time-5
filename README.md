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

- **Java 17** com **Spring Boot 3** (Spring Web, Spring Security e Validation)
- Expõe HTTP para o front e conversa com o `server/` por socket. Não acessa o banco.
- Build com **Maven**

### Server (`server/`)

- **Java 17** puro, socket TCP na porta 5000
- Única dependência: driver `mongodb-driver-sync`
- É o único processo que fala com o banco
- Build com **Maven**

### Banco de dados

- **MongoDB Atlas** (cluster M0 gratuito em desenvolvimento)

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
├── server/           # Java puro, socket TCP, único que acessa o MongoDB
│   ├── src/main/java/br/puccampinas/pedeai/server/
│   └── pom.xml
├── backend/          # API HTTP em Java com Spring Boot, sem acesso ao banco
│   ├── src/main/java/br/puccampinas/pedeai/
│   └── pom.xml
├── frontend/         # Aplicação React com Rsbuild
│   ├── src/
│   └── package.json
├── docs/             # Contratos, modelo de dados, arquitetura e protocolo do socket
└── README.md
```

Fluxo de uma requisição: `frontend` chama `backend` por HTTP, `backend` chama `server` por socket e `server` consulta o MongoDB.

## Como rodar

Pré-requisitos: JDK 17 ou superior, Maven 3.9 ou superior, Node 20 ou superior e acesso a um MongoDB (Atlas ou local).

### 1. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com os valores reais. O arquivo `.env` nunca vai para o repositório.

```bash
cp server/.env.example server/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

O Java não lê arquivos `.env` sozinho: exporte as variáveis no terminal antes de subir cada processo, ou configure-as na sua IDE.

`server/.env.example`:

```
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/pedeai
SOCKET_PORT=5000
```

`backend/.env.example`:

```
SOCKET_HOST=localhost
SOCKET_PORT=5000
JWT_SECRET=troque-esta-chave
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

Confira em `http://localhost:8080/health`. A resposta mostra o estado do server e do banco. Sem o server no ar, a resposta é 503.

### 4. Frontend (terceiro)

```bash
cd frontend
npm install
npm run dev
```

A aplicação sobe em `http://localhost:3000` e consome o backend pelo endereço do `.env`.

### 5. Dados de exemplo

O script de carga com um estabelecimento de demonstração ainda não existe. Enquanto isso, o `MENU_LIST` só devolve dados se existirem documentos nas coleções `tenant`, `category` e `product`, conforme `docs/modelo.md`.

## Convenções

Estas regras valem para todo o código e evitam retrabalho:

- **Só o `server/` acessa o banco.** O `backend/` pede tudo pelo socket.
- **Multiempresa.** Toda coleção, exceto `tenant`, tem `tenantId` e toda consulta filtra por ele. Nenhuma exceção.
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
| `docs/contratos.md` | Rotas da API, entrada, saída e códigos de erro |
| `docs/modelo.md` | Dicionário de dados: coleções, campos, tipos e índices |
| `docs/arquitetura.md` | Os três processos, camadas, pastas e decisões técnicas com justificativa |
| `docs/protocolo.md` | Protocolo de texto do socket entre `backend/` e `server/`, comandos e exemplos |

## GitHub Projects

O quadro de tarefas fica em [Projects deste repositório](https://github.com/PresetyX/PI_IV-Time-5/projects).

Campos usados em cada card: Status (A fazer, Fazendo, Em revisão, Feito), Etapa, Frente (back, front, banco, teste, documentação, infra), Pontos e Responsável.

## Cronograma

| Etapa | Período | Foco |
| --- | --- | --- |
| E0 Fundação | 14/10 a 20/10 | Monorepo, cluster, base do server, do backend e do frontend, contratos e dicionário |
| E1 Multiempresa e acesso | 21/10 a 03/11 | Estabelecimento como tenant, login, perfis e tema da casa |
| E2 Cardápio e mesas | 04/11 a 17/11 | Categorias, produtos, disponibilidade, mesas e QR code |
| E3 Conta e pedido | 18/11 a 30/11 | Identificação do cliente, conta, carrinho, envio e acompanhamento |
| E4 Operação e fechamento | 01/12 a 09/12 | Cozinha, salão, pagamento manual, retirada e relatórios |
| E5 Qualidade e entrega | 10/12 a 16/12 | Testes, documentação, demonstração e apresentação |

## Licença

Projeto acadêmico desenvolvido para a disciplina de Engenharia de Software.

---

**Status:** em desenvolvimento
