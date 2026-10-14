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

Todos trabalham nas duas pontas, backend e frontend. A divisão por card está na aba Cards da planilha de backlog e no GitHub Projects.

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

### Backend

- **Java 17** com **Spring Boot 3** (Spring Web, Spring Data MongoDB, Spring Security e Validation)
- Build com **Maven**

### Banco de dados

- **MongoDB Atlas** (cluster M0 gratuito em desenvolvimento)

### Frontend

- **React 18** com **TypeScript**
- Build com **Rsbuild** (Rspack)
- **Material UI** como biblioteca de componentes, com tema carregado da configuração do estabelecimento

### Pagamentos

- **Registro manual** da forma de pagamento: pix manual, dinheiro ou cartão
- Integração com gateway em sandbox fica como extensão, fora desta versão

## Estrutura do projeto

```
PI_IV-Time-5/
├── backend/          # API em Java com Spring Boot
│   ├── src/main/java/br/puccampinas/pedeai/
│   └── pom.xml
├── frontend/         # Aplicação React com Rsbuild
│   ├── src/
│   └── package.json
├── docs/             # Contratos da API, dicionário de dados e arquitetura
└── README.md
```

## Como rodar

Pré-requisitos: JDK 17 ou superior, Maven 3.9 ou superior, Node 20 ou superior e acesso a um MongoDB (Atlas ou local).

### 1. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com os valores reais. O arquivo `.env` nunca vai para o repositório.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env.example`:

```
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/pedeai
JWT_SECRET=troque-esta-chave
JWT_EXPIRACAO_MINUTOS=480
CORS_ORIGENS=http://localhost:3000
```

`frontend/.env.example`:

```
PUBLIC_API_URL=http://localhost:8080
```

A string de conexão real fica no grupo, não no repositório.

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

Confira em `http://localhost:8080/health`. A resposta mostra o estado da aplicação e da conexão com o banco.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação sobe em `http://localhost:3000` e consome a API pelo endereço do `.env`.

### 4. Dados de exemplo

O script de carga cria um estabelecimento de demonstração com usuário dono, cardápio e mesas, para ninguém começar com o banco vazio.

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=seed
```

## Convenções

Estas regras valem para todo o código e evitam retrabalho:

- **Multiempresa.** Toda coleção tem `estabelecimentoId` e toda consulta filtra por ele. Nenhuma exceção.
- **Dinheiro em centavos**, sempre como inteiro. `3200` é R$ 32,00. Nada de ponto flutuante em valor.
- **Datas em UTC** no banco, convertidas para o fuso da casa na exibição.
- **Cópia de nome e preço** no item do pedido. Mudança no cardápio não altera pedido já enviado.
- **Erro da API** sempre no formato `{ "erro": "codigo_do_erro", "mensagem": "texto para a tela" }`.
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
| `docs/arquitetura.md` | Camadas, pastas e decisões técnicas com justificativa |

## GitHub Projects

O quadro de tarefas fica em [Projects deste repositório](https://github.com/PresetyX/PI_IV-Time-5/projects).

Campos usados em cada card: Status (A fazer, Fazendo, Em revisão, Feito), Etapa, Frente (back, front, banco, teste, documentação, infra), Pontos e Responsável.

## Cronograma

| Etapa | Período | Foco |
| --- | --- | --- |
| E0 Fundação | 14/10 a 20/10 | Monorepo, cluster, base do backend e do front, contratos e dicionário |
| E1 Multiempresa e acesso | 21/10 a 03/11 | Estabelecimento como tenant, login, perfis e tema da casa |
| E2 Cardápio e mesas | 04/11 a 17/11 | Categorias, produtos, disponibilidade, mesas e QR code |
| E3 Conta e pedido | 18/11 a 30/11 | Identificação do cliente, conta, carrinho, envio e acompanhamento |
| E4 Operação e fechamento | 01/12 a 09/12 | Cozinha, salão, pagamento manual, retirada e relatórios |
| E5 Qualidade e entrega | 10/12 a 16/12 | Testes, documentação, demonstração e apresentação |

## Licença

Projeto acadêmico desenvolvido para a disciplina de Engenharia de Software.

---

**Status:** em desenvolvimento
