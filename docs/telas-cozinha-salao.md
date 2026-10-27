# Telas 63–86 — cozinha e salão

Implementação visual responsiva baseada nas imagens fornecidas. Não foi executado build, navegador, Maven, Node ou MongoDB nesta conversa. Não há garantia de fidelidade pixel a pixel sem validação visual.

## Rotas

- 63–65 e 68: `/producao` (fila real, filtros, vazio). A fila é vazia quando não há dados reais; não injeta exemplos para forçar estados.
- 66–67: `/producao/pedido/:id`.
- 69–70: `/producao/confirmar/:id`.
- 71–72: `/producao/pausar`.
- 73: `/producao/tela-grande`.
- 74: `/producao/impressao`.
- 75–76: `/producao/cancelar/:id`.
- 77–78: `/salao`.
- 79: `/salao/entregas`.
- 80–81: `/salao/chamados`.
- 82–83: `/fila-espera`.
- 84–85: `/contas/:id`.
- 86: `/contas/:id/conferencia`.

## Dados e ações reais

Novo endpoint autenticado `GET /api/operations/workspace`: lê store, table, tab, order e waitlist sem criar coleções. Todas as consultas de coleções dependentes usam storeId do JWT. Store é consultada pelo próprio _id. Projeções evitam expor credenciais, tokens de mesa, telefone e dados de participantes. A cozinha não recebe a fila de espera. Campos de totais ausentes exibem travessão, não inventam valor.

Mudanças RECEIVED → PREPARING → READY e READY → DELIVERED usam o endpoint atômico do primeiro card e respeitam perfis. A lista atualiza a cada 15 segundos. Relógio usa diferença para serverTime. Atraso visual é de 15 minutos; esse limite é uma decisão da implementação, ainda não uma configuração da loja. Entregas ordenam pelo horário em que ficaram prontas. Observações e opções ficam visíveis. Impressão é manual pelo navegador, sem promessa de impressão silenciosa/automática.

## Telas prontas visualmente, integrações ainda pendentes

Não confundir cobertura visual com backend completo. Pausa tem formulário, mas a gravação fica desabilitada até o bloqueio real do fluxo de criação existir. Não há expiração automática implementada nesta entrega. Cancelamento fica desabilitado: falta contrato de recálculo da comanda e comissão. Pagamento e fechamento ficam desabilitados: pertencem ao módulo financeiro. Abrir conta, chamar/sentar/remover pessoas da espera e atender chamado exibem explicitamente que a integração falta, sem sucesso fictício. Chamados leem `tab.waiterCalls` quando esse campo existe; ainda falta alinhar contrato com o produtor de chamados. Não foram criadas coleções nem endpoints financeiros.

Métricas de hoje, tempo médio, nome do garçom e confirmação de aviso ao cliente não são inventados. Senha só aparece quando `tab.pickupTicket` realmente existe. Paginação, volume de dados e granularidade de acesso de cozinha a dados da comanda devem ser revisados antes de produção.

## Validar

`mvn -f backend/pom.xml test`; `cd frontend && npm ci && npm run build`.

Testar login KITCHEN/WAITER/MANAGER, loja A versus B, pedidos reais, 409 concorrente, expiração de sessão, falha de rede, lista vazia, tela 360/390/768/1440 px, teclado, leitor de tela, links diretos e impressão manual. Validar também campos e tipos com o schema real do banco e comparar capturas no navegador com as referências.
