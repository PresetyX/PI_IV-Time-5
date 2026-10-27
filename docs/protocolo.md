# Protocolo do socket

O `server/` expõe um protocolo de texto sobre TCP, na porta 5000 por padrão (variável `SOCKET_PORT`). O `server/` não acessa banco: ele só valida dados que o `backend/` envia antes de aceitar um pedido ou um pagamento. O `backend/` é o único cliente em produção. O `TestClient` serve para testar à mão.

## Regras gerais

- Uma conexão carrega uma requisição: o cliente abre, envia uma linha, lê uma linha e a conexão é fechada pelo servidor.
- Codificação UTF-8. Cada linha termina em `\n`. Linhas de requisição têm no máximo 8192 caracteres.
- Se o cliente não enviar a linha em 10 segundos, a conexão é encerrada.

## Formato da requisição

```
COMMAND|key=value|key=value
```

- O nome do comando vem primeiro, sem diferenciar maiúsculas de minúsculas.
- Cada parâmetro é `chave=valor`. A chave não pode conter `=`. O valor pode conter `=`.
- Dentro de um valor, os caracteres especiais são escritos com barra invertida:

| Escrever | Significa |
| --- | --- |
| `\|` | o caractere `|` |
| `\\` | o caractere `\` |
| `\n` | quebra de linha |
| `\r` | retorno de carro |

## Formato da resposta

Sucesso:

```
OK|json
```

Erro:

```
ERROR|code|message
```

O JSON é compacto, em uma única linha. Em `ERROR`, o cliente deve separar a linha em, no máximo, três partes: a mensagem pode conter `|`.

## Comandos

| Comando | Parâmetros | Resposta | Erros |
| --- | --- | --- | --- |
| `PING` | nenhum | `{"status":"ok"}` | nenhum |
| `VALIDATE_ORDER` | `items`, `totalCents`, `computedCents`, `openAt`, `closeAt`, `now` | `{"valid":true,"totalCents":5400}` | `INVALID_PARAMS`, `CLOSED_HOURS`, `TOTAL_MISMATCH` |

### VALIDATE_ORDER

Parâmetros:

| Parâmetro | Formato |
| --- | --- |
| `items` | Array JSON. Cada item tem `unitPriceCents` (inteiro), `quantity` (inteiro), `note` (texto, opcional) e `options` (lista de objetos com `deltaCents`, opcional). Os nomes seguem os itens do pedido em `banco/init-mongo.js` |
| `totalCents` | Total informado no pedido, em centavos |
| `computedCents` | Total que o backend calculou com os preços do banco, em centavos |
| `openAt`, `closeAt` | Horário de abertura e de fechamento da loja, `HH:mm` |
| `now` | Hora atual no fuso da loja, `HH:mm` |

Regras, nesta ordem:

1. Todos os parâmetros presentes e no formato certo; `items` com ao menos um item; `quantity` entre 1 e 20; `note` com até 140 caracteres; valores em centavos inteiros e não negativos. Se falhar: `INVALID_PARAMS`.
2. `now` dentro do horário da loja. Se `closeAt` é menor que `openAt`, o expediente atravessa a meia-noite. Se falhar: `CLOSED_HOURS`.
3. A soma dos itens (`quantity` vezes `unitPriceCents` mais os `deltaCents` das opções) é igual a `computedCents`, e `totalCents` é igual a `computedCents`. Se falhar: `TOTAL_MISMATCH`.

## Códigos de erro

| Código | Quando |
| --- | --- |
| `EMPTY_REQUEST` | Linha vazia |
| `UNKNOWN_COMMAND` | Comando que não existe |
| `INVALID_PARAM` | Parâmetro fora do formato `chave=valor` |
| `INVALID_PARAMS` | Parâmetro de `VALIDATE_ORDER` ausente ou inválido |
| `CLOSED_HOURS` | Pedido fora do horário da loja |
| `TOTAL_MISMATCH` | Total informado não confere com a soma |
| `INTERNAL` | Falha inesperada |

## Exemplos

Verificar o servidor:

```
> PING
OK|{"status":"ok"}
```

Pedido válido:

```
> VALIDATE_ORDER|items=[{"unitPriceCents":3200,"quantity":1,"options":[{"deltaCents":600}]},{"unitPriceCents":800,"quantity":2}]|totalCents=5400|computedCents=5400|openAt=17:00|closeAt=23:00|now=20:30
OK|{"valid":true,"totalCents":5400}
```

Total que não confere:

```
> VALIDATE_ORDER|items=[{"unitPriceCents":3200,"quantity":1,"options":[{"deltaCents":600}]},{"unitPriceCents":800,"quantity":2}]|totalCents=5000|computedCents=5400|openAt=17:00|closeAt=23:00|now=20:30
ERROR|TOTAL_MISMATCH|Total 5000 does not match computed 5400 (items sum 5400)
```

## Testando pela linha de comando

Com o servidor rodando:

```bash
mvn -f server/pom.xml compile
java -cp server/target/classes br.puccampinas.pedeai.server.TestClient "PING"
```

Sem argumentos, o `TestClient` abre um modo interativo: uma requisição por linha, linha vazia para sair. Ele lê `SOCKET_HOST` e `SOCKET_PORT`.
