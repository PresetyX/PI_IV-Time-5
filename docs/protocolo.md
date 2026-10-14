# Protocolo do socket

O `server/` expõe um protocolo de texto sobre TCP, na porta 5000 por padrão (variável `SOCKET_PORT`). O `backend/` é o único cliente em produção. O `TestClient` serve para testar à mão.

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

Todo dado de negócio é filtrado por `tenantId` dentro do servidor. O cliente nunca envia `tenantId`: ele identifica o estabelecimento pelo `slug`.

| Comando | Parâmetros | Resposta | Erros |
| --- | --- | --- | --- |
| `PING` | nenhum | `{"status":"ok","database":"connected"}` ou `{"status":"ok","database":"disconnected"}` | nenhum |
| `TENANT_GET` | `slug` | Documento do tenant, com `_id` devolvido como `id` | `MISSING_PARAM`, `NOT_FOUND`, `DATABASE_UNAVAILABLE` |
| `MENU_LIST` | `tenant` (o `slug` do estabelecimento) | `{"tenant":{...},"categories":[{"id","name","products":[...]}]}` apenas com categorias ativas e produtos disponíveis | `MISSING_PARAM`, `NOT_FOUND`, `DATABASE_UNAVAILABLE` |

Comandos declarados e ainda não implementados respondem `ERROR|NOT_IMPLEMENTED|...`: `PRODUCT_UPSERT`, `TABLE_LIST`, `BILL_OPEN`, `BILL_GET`, `BILL_LIST`, `BILL_CLOSE`, `ORDER_CREATE`, `ORDER_QUEUE`, `ORDER_STATUS`, `TICKET_NEXT`, `REPORT_SUMMARY` e `USER_BY_EMAIL`.

## Códigos de erro

| Código | Quando |
| --- | --- |
| `EMPTY_REQUEST` | Linha vazia |
| `UNKNOWN_COMMAND` | Comando que não existe |
| `INVALID_PARAM` | Parâmetro fora do formato `chave=valor` |
| `MISSING_PARAM` | Parâmetro obrigatório ausente |
| `NOT_FOUND` | Registro não encontrado |
| `NOT_IMPLEMENTED` | Comando declarado, ainda sem implementação |
| `DATABASE_UNAVAILABLE` | O servidor não alcançou o MongoDB |
| `INTERNAL` | Falha inesperada |

## Exemplos

Verificar o servidor:

```
> PING
OK|{"status":"ok","database":"connected"}
```

Buscar um estabelecimento que não existe:

```
> TENANT_GET|slug=naoexiste
ERROR|NOT_FOUND|Tenant not found: naoexiste
```

Listar o cardápio:

```
> MENU_LIST|tenant=demo
OK|{"tenant":{"id":"6650...","slug":"demo","name":"Bar do Demo"},"categories":[{"id":"6651...","name":"Bebidas","products":[{"id":"6652...","name":"Suco","description":"Laranja","priceCents":800}]}]}
```

## Testando pela linha de comando

Com o servidor rodando:

```bash
mvn -f server/pom.xml compile
java -cp server/target/classes br.puccampinas.pedeai.server.TestClient "PING"
```

Sem argumentos, o `TestClient` abre um modo interativo: uma requisição por linha, linha vazia para sair. Ele lê `SOCKET_HOST` e `SOCKET_PORT`.
