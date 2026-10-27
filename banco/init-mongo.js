// Pede Aí · criação das coleções, validação de esquema e índices
// Uso: mongosh "<string de conexao>" banco/init-mongo.js
// Pode rodar de novo: coleção que já existe tem só o validador atualizado.

const DB = db.getSiblingDB(db.getName());

// ---------------------------------------------------------------- utilidades
function criar(nome, esquema) {
  const existe = DB.getCollectionNames().indexOf(nome) >= 0;
  const opcoes = { validator: { $jsonSchema: esquema }, validationLevel: "moderate" };
  if (existe) {
    DB.runCommand(Object.assign({ collMod: nome }, opcoes));
    print("atualizado  " + nome);
  } else {
    DB.createCollection(nome, opcoes);
    print("criado      " + nome);
  }
}

const oid = { bsonType: "objectId" };
const texto = { bsonType: "string" };
const inteiro = { bsonType: "int" };
const data = { bsonType: "date" };
const bool = { bsonType: "bool" };
const storeId = { bsonType: "objectId", description: "obrigatório em todo documento: isola a loja" };

// ---------------------------------------------------------------- store
// A casa. Tudo que é whitelabel mora aqui: nome, slug, cor, horário e regras.
criar("store", {
  bsonType: "object",
  required: ["slug", "name", "primaryColor", "serviceFeeBasisPoints", "commissionBasisPoints", "isTraining", "active", "createdAt"],
  properties: {
    slug: { bsonType: "string", pattern: "^[a-z0-9-]{3,40}$", description: "vai na URL: pedeai.app/<slug>" },
    name: texto,
    kind: { enum: ["BAR", "RESTAURANTE", "LANCHONETE", "CAFETERIA", null] },
    document: texto,
    phone: texto,
    address: {
      bsonType: "object",
      properties: { street: texto, number: texto, district: texto, city: texto, state: texto, zip: texto }
    },
    logoUrl: texto,
    primaryColor: { bsonType: "string", pattern: "^#[0-9A-Fa-f]{6}$", description: "cor da casa no app do cliente" },
    tagline: texto,
    openingHours: {
      bsonType: "array",
      description: "um item por dia da semana",
      items: {
        bsonType: "object",
        required: ["weekday", "opensAt", "closesAt"],
        properties: {
          weekday: { bsonType: "int", minimum: 0, maximum: 6 },
          opensAt: { bsonType: "string", pattern: "^[0-2][0-9]:[0-5][0-9]$" },
          closesAt: { bsonType: "string", pattern: "^[0-2][0-9]:[0-5][0-9]$" },
          lastOrderAt: { bsonType: "string", pattern: "^[0-2][0-9]:[0-5][0-9]$" }
        }
      }
    },
    serviceModes: {
      bsonType: "array",
      items: { enum: ["TABLE", "COUNTER", "DELIVERY"] },
      description: "o que aparece na tela de escolha do cliente"
    },
    serviceFeeBasisPoints: { bsonType: "int", minimum: 0, maximum: 3000, description: "1000 = 10%" },
    commissionBasisPoints: { bsonType: "int", minimum: 0, maximum: 3000, description: "500 = 5%" },
    requireCustomerPhone: bool,
    pausedUntil: data,
    pausedScopes: { bsonType: "array", items: { enum: ["KITCHEN", "DRINKS", "COUNTER"] } },
    isTraining: { bsonType: "bool", description: "loja de treino: não entra em relatório" },
    active: bool,
    createdAt: data,
    updatedAt: data
  }
});

// ---------------------------------------------------------------- user
criar("user", {
  bsonType: "object",
  required: ["storeId", "name", "email", "passwordHash", "role", "active", "createdAt"],
  properties: {
    storeId: storeId,
    name: texto,
    email: { bsonType: "string", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
    passwordHash: texto,
    role: { enum: ["OWNER", "MANAGER", "WAITER", "KITCHEN"] },
    active: bool,
    mustChangePassword: bool,
    failedAttempts: inteiro,
    lockedUntil: data,
    lastLoginAt: data,
    createdAt: data,
    updatedAt: data
  }
});

// ---------------------------------------------------------------- table
criar("table", {
  bsonType: "object",
  required: ["storeId", "number", "token", "active", "createdAt"],
  properties: {
    storeId: storeId,
    number: { bsonType: "int", minimum: 1 },
    nickname: texto,
    seats: inteiro,
    token: { bsonType: "string", description: "o que vai no QR code; trocar invalida a plaquinha" },
    active: bool,
    createdAt: data
  }
});

// ---------------------------------------------------------------- category
criar("category", {
  bsonType: "object",
  required: ["storeId", "name", "position", "visible"],
  properties: {
    storeId: storeId,
    name: texto,
    position: { bsonType: "int", minimum: 0, description: "ordem no cardápio do cliente" },
    visible: bool
  }
});

// ---------------------------------------------------------------- product
criar("product", {
  bsonType: "object",
  required: ["storeId", "categoryId", "name", "priceCents", "available", "position"],
  properties: {
    storeId: storeId,
    categoryId: oid,
    name: texto,
    description: { bsonType: "string", maxLength: 140 },
    priceCents: { bsonType: "int", minimum: 1, description: "sempre inteiro: 3200 = R$ 32,00" },
    imageUrl: texto,
    prepMinutes: inteiro,
    available: bool,
    unavailableSince: data,
    isAlcoholic: { bsonType: "bool", description: "dispara a confirmação de maioridade" },
    position: inteiro,
    optionGroups: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["name", "required", "min", "max", "options"],
        properties: {
          name: texto,
          required: bool,
          min: inteiro,
          max: inteiro,
          options: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["label", "deltaCents"],
              properties: { label: texto, deltaCents: inteiro }
            }
          }
        }
      }
    }
  }
});

// ---------------------------------------------------------------- customerSession
criar("guestSession", {
  bsonType: "object",
  required: ["storeId", "mode", "createdAt", "expiresAt"],
  properties: {
    storeId: storeId,
    tableId: oid,
    mode: { enum: ["TABLE", "COUNTER", "DELIVERY"] },
    name: texto,
    phone: texto,
    a11yPrefs: {
      bsonType: "object",
      properties: { scale: { bsonType: "double" }, highContrast: bool }
    },
    consent: {
      bsonType: "object",
      properties: { notify: bool, history: bool, at: data }
    },
    createdAt: data,
    expiresAt: { bsonType: "date", description: "TTL apaga a sessão sozinho" }
  }
});

// ---------------------------------------------------------------- bill
criar("tab", {
  bsonType: "object",
  required: ["storeId", "mode", "status", "ownerSessionId", "managedBy", "openedAt"],
  properties: {
    storeId: storeId,
    tableId: oid,
    mode: { enum: ["TABLE", "COUNTER", "DELIVERY"] },
    customerName: texto,
    ownerSessionId: { bsonType: "objectId", description: "quem abriu é quem fecha" },
    managedBy: { enum: ["CUSTOMER", "STAFF"] },
    managedByUserId: oid,
    joinCode: { bsonType: "string", pattern: "^[0-9]{4}$" },
    joinCodeExpiresAt: data,
    participants: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["sessionId", "name", "joinedAt"],
        properties: { sessionId: oid, name: texto, joinedAt: data, removedAt: data }
      }
    },
    status: { enum: ["OPEN", "AWAITING_PAYMENT", "CLOSED"] },
    subtotalCents: inteiro,
    serviceFeeCents: inteiro,
    discountCents: inteiro,
    discountReason: { enum: ["DELAY", "WRONG_ORDER", "REGULAR", "OWNER", null] },
    discountByUserId: oid,
    totalCents: inteiro,
    paidCents: inteiro,
    splitMode: { enum: ["SINGLE", "EQUAL", "BY_CONSUMPTION", null] },
    mergedWithBillId: oid,
    openedAt: data,
    closedAt: data,
    closedByUserId: oid,
    reopenedAt: data,
    reopenReason: texto
  }
});

// ---------------------------------------------------------------- order
criar("order", {
  bsonType: "object",
  required: ["storeId", "tabId", "number", "status", "items", "totalCents", "createdAt"],
  properties: {
    storeId: storeId,
    tabId: oid,
    tableId: oid,
    number: { bsonType: "int", description: "número do dia, vem de counter" },
    status: { enum: ["RECEIVED", "PREPARING", "READY", "DELIVERED", "CANCELLED"] },
    ageConfirmed: bool,
    items: {
      bsonType: "array",
      minItems: 1,
      items: {
        bsonType: "object",
        required: ["productId", "nameSnapshot", "unitPriceCents", "quantity", "status", "placedByType"],
        properties: {
          productId: oid,
          nameSnapshot: { bsonType: "string", description: "cópia do nome no envio" },
          unitPriceCents: { bsonType: "int", description: "cópia do preço no envio" },
          quantity: { bsonType: "int", minimum: 1 },
          note: { bsonType: "string", maxLength: 140 },
          options: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["group", "label", "deltaCents"],
              properties: { group: texto, label: texto, deltaCents: inteiro }
            }
          },
          status: { enum: ["RECEIVED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "REMOVED"] },
          placedByType: { enum: ["CUSTOMER", "PARTICIPANT", "STAFF"] },
          placedByUserId: oid,
          placedBySessionId: oid,
          removedAt: data,
          removedByUserId: oid
        }
      }
    },
    totalCents: inteiro,
    cancelReason: { enum: ["GAVE_UP", "WRONG_ORDER", "OUT_OF_STOCK", "DUPLICATE", null] },
    cancelledByUserId: oid,
    createdAt: data,
    readyAt: data,
    deliveredAt: data
  }
});

// ---------------------------------------------------------------- payment
criar("payment", {
  bsonType: "object",
  required: ["storeId", "tabId", "method", "amountCents", "isPartial", "createdAt"],
  properties: {
    storeId: storeId,
    tabId: oid,
    method: { enum: ["PIX_MANUAL", "CASH", "CARD_DEBIT", "CARD_CREDIT"] },
    amountCents: { bsonType: "int", minimum: 1 },
    payerName: texto,
    isPartial: bool,
    registeredByUserId: oid,
    createdAt: data
  }
});

// ---------------------------------------------------------------- commission
criar("commission", {
  bsonType: "object",
  required: ["storeId", "userId", "tabId", "orderId", "baseCents", "rateBasisPoints", "amountCents", "status", "createdAt"],
  properties: {
    storeId: storeId,
    userId: oid,
    tabId: oid,
    orderId: oid,
    baseCents: inteiro,
    rateBasisPoints: inteiro,
    amountCents: inteiro,
    status: { enum: ["PENDING", "CONFIRMED", "REVERSED", "PAID"] },
    createdAt: data,
    confirmedAt: data,
    reversedAt: data
  }
});

// ---------------------------------------------------------------- cashSession
criar("cashDay", {
  bsonType: "object",
  required: ["storeId", "openedByUserId", "openingFloatCents", "openedAt"],
  properties: {
    storeId: storeId,
    openedByUserId: oid,
    openingFloatCents: inteiro,
    openedAt: data,
    closedAt: data,
    closedByUserId: oid,
    countedCents: {
      bsonType: "object",
      properties: { CASH: inteiro, PIX_MANUAL: inteiro, CARD_DEBIT: inteiro, CARD_CREDIT: inteiro }
    },
    differenceCents: inteiro,
    differenceNote: texto,
    withdrawals: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["reason", "amountCents", "at", "byUserId"],
        properties: { reason: texto, amountCents: inteiro, at: data, byUserId: oid }
      }
    }
  }
});

// ---------------------------------------------------------------- orderEvent
criar("orderEvent", {
  bsonType: "object",
  required: ["storeId", "orderId", "type", "at"],
  properties: {
    storeId: storeId,
    orderId: oid,
    type: { enum: ["CREATED", "STATUS_CHANGED", "ITEM_REMOVED", "CANCELLED", "PRINTED"] },
    from: texto,
    to: texto,
    byUserId: oid,
    note: texto,
    at: data
  }
});

// ---------------------------------------------------------------- tableMerge
criar("tableChange", {
  bsonType: "object",
  required: ["storeId", "kind", "fromTableId", "toTableId", "byUserId", "at"],
  properties: {
    storeId: storeId,
    kind: { enum: ["MERGE", "MOVE"] },
    fromTableId: oid,
    toTableId: oid,
    byUserId: oid,
    at: data
  }
});

// ---------------------------------------------------------------- waitlistEntry (fora do MVP)
criar("waitlist", {
  bsonType: "object",
  required: ["storeId", "name", "partySize", "number", "status", "createdAt"],
  properties: {
    storeId: storeId,
    name: texto,
    phone: texto,
    partySize: inteiro,
    number: inteiro,
    status: { enum: ["WAITING", "CALLED", "SEATED", "GAVE_UP"] },
    createdAt: data,
    calledAt: data
  }
});

// ---------------------------------------------------------------- counter
criar("sequence", {
  bsonType: "object",
  required: ["_id", "seq"],
  properties: {
    _id: { bsonType: "string", description: "<storeId>:<AAAA-MM-DD>:<tipo>" },
    seq: inteiro
  }
});

// ---------------------------------------------------------------- índices
print("");
const indices = [
  ["store", { slug: 1 }, { unique: true }],
  ["user", { storeId: 1, email: 1 }, { unique: true }],
  ["user", { storeId: 1, role: 1 }, {}],
  ["table", { storeId: 1, number: 1 }, { unique: true }],
  ["table", { token: 1 }, { unique: true }],
  ["category", { storeId: 1, position: 1 }, {}],
  ["product", { storeId: 1, categoryId: 1, position: 1 }, {}],
  ["product", { storeId: 1, available: 1 }, {}],
  ["guestSession", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ["guestSession", { storeId: 1, tableId: 1 }, {}],
  ["tab", { storeId: 1, status: 1, openedAt: -1 }, {}],
  ["tab", { storeId: 1, tableId: 1, status: 1 }, {}],
  ["tab", { storeId: 1, closedAt: -1 }, {}],
  ["tab", { joinCode: 1, joinCodeExpiresAt: 1 }, {}],
  ["order", { storeId: 1, status: 1, createdAt: 1 }, {}],
  ["order", { storeId: 1, tabId: 1, createdAt: 1 }, {}],
  ["order", { storeId: 1, number: 1, createdAt: -1 }, {}],
  ["payment", { storeId: 1, tabId: 1 }, {}],
  ["commission", { storeId: 1, userId: 1, status: 1, createdAt: -1 }, {}],
  ["commission", { orderId: 1 }, {}],
  ["cashDay", { storeId: 1, openedAt: -1 }, {}],
  ["orderEvent", { orderId: 1, at: 1 }, {}],
  ["tableChange", { storeId: 1, at: -1 }, {}],
  ["waitlist", { storeId: 1, status: 1, number: 1 }, {}]
];
indices.forEach(function (i) {
  DB.getCollection(i[0]).createIndex(i[1], i[2]);
  print("índice      " + i[0] + " " + JSON.stringify(i[1]));
});

print("");
print("Pronto. " + DB.getCollectionNames().length + " coleções no banco " + DB.getName() + ".");
