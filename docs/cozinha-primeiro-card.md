# Cozinha — primeiro card

## Escopo deste commit

Fila real em `/producao`, responsiva, com filtros de origem e status, detalhe, confirmação de pronto, observações destacadas e atraso após 15 minutos. Não são dados mockados. A origem vem da coleção `tab`, a mesa de `table` e os itens do snapshot de `order`.

Não cria coleções nem implementa criação de pedido ou pagamento. Usa o MongoTemplate do backend existente; o server TCP permanece intacto porque este card só lê pedidos aceitos e muda status. Não altera o tema global carregado pela aplicação.

## API autenticada

- `GET /api/operations/queue?status=ALL&mode=ALL`: status ALL, RECEIVED, PREPARING ou READY; origem ALL, TABLE ou COUNTER. Ordenação por criação, mais antigo primeiro.
- `GET /api/operations/orders/{id}`: detalhe real com isolamento por loja.
- `PATCH /api/operations/orders/{id}/status`: `{ "expectedStatus": "RECEIVED", "status": "PREPARING" }`.

Transições: RECEIVED → PREPARING → READY → DELIVERED. Cozinha, gerente e dono consultam a fila e fazem as duas primeiras transições. Somente garçom, gerente ou dono confirmam DELIVERED. Entrega já tem endpoint, mas a tela de salão fica para o próximo card.

A loja e o usuário vêm exclusivamente do principal JWT, nunca do corpo ou query string. Alteração atômica exige o status esperado; concorrência retorna 409. IDs inválidos retornam 400; registro ausente ou de outra loja retorna 404; perfil indevido retorna 403. Histórico da alteração fica embutido em `order.statusHistory`, na mesma escrita atômica, com usuário e data. Não utiliza coleção nova. Os itens ativos acompanham o status do pedido; itens REMOVED e CANCELLED ficam intactos.

## Interface

Atualiza após a gravação e consulta a fila a cada cinco segundos, sem sobrepor consultas do polling. Descarta respostas de filtros anteriores. Falha de rede sinaliza dados não sincronizados e bloqueia mudanças até uma consulta bem-sucedida. Não inventa estatísticas quando a fila está vazia. Pedidos READY não são classificados como atraso de preparo. A senha de retirada não é inferida do número do pedido: sem um contrato real de senha, a tela exibe `pedido #n`.

## Verificação pendente

Este código foi preparado por leitura remota do repositório. Maven, TypeScript, Rsbuild, navegador e MongoDB NÃO foram executados nesta conversa. Não considerar este documento prova de build ou teste aprovado.

Rodar:

```bash
mvn -f backend/pom.xml test
cd frontend
npm ci
npm run build
npm run dev
```

Com backend e MongoDB configurados e dados reais em `order`, `tab` e `table`, entrar com perfil KITCHEN e abrir `/producao`. Validar:

1. Filtros retornam apenas pedidos da loja autenticada.
2. RECEIVED muda para PREPARING; PREPARING exige confirmação para READY.
3. Dois clientes alterando o mesmo status: apenas um vence; o outro recebe 409.
4. Pedido de outra loja retorna 404 e não é alterado.
5. Pedido com 15 minutos fica destacado; READY não fica atrasado por preparo.
6. Observações e opções dos itens aparecem na lista, detalhe e confirmação.
7. Sem pedidos mostra fila vazia; sem rede mostra falha, não fila vazia falsa.
8. Conferir layout a 360 px e desktop, teclado, foco e leitor de tela.
9. Conferir que itens removidos ou cancelados não retornam à produção.
10. Conferir arrayFilters na versão do MongoDB usada no Atlas.

## Próximos cards — ainda não implementados

Salão e mapa de mesas; entregas pendentes no frontend; registrar/listar/atender chamados; pausar pedidos por tempo com expiração automática e bloqueio no fluxo real de criação; cancelamento com motivo e integração com total da comanda; impressão e modo tela grande. Não acrescentar pagamento, fila de espera ou alteração financeira sem alinhar com os responsáveis dos módulos correspondentes.
