// Cria as coleções do Pede Aí com validação, os índices e o estabelecimento de demonstração.
// Uso: mongosh "$MONGODB_URI" server/scripts/init-db.js
// Idempotente: pode rodar de novo sem duplicar nada. Modelo completo em docs/modelo.md.

db = db.getSiblingDB('pedeai');

const id = { bsonType: 'objectId' };
const str = { bsonType: 'string' };
const bool = { bsonType: 'bool' };
const int = { bsonType: 'int' };
const cents = { bsonType: 'int', minimum: 0 };
const date = { bsonType: 'date' };
const oneOf = (...values) => ({ bsonType: 'string', enum: values });

const ORDER_STATUS = ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELED'];

function schema(required, properties) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['createdAt', 'updatedAt', ...required],
      properties: { _id: id, createdAt: date, updatedAt: date, ...properties },
    },
  };
}

const collections = {
  tenant: {
    validator: schema(['slug', 'name', 'active', 'branding', 'settings'], {
      slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
      name: str,
      active: bool,
      branding: {
        bsonType: 'object',
        required: ['primaryColor'],
        properties: {
          logoUrl: str,
          primaryColor: { bsonType: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        },
      },
      settings: {
        bsonType: 'object',
        required: ['tableService', 'counterService', 'requireCustomerName', 'requireCustomerPhone'],
        properties: {
          tableService: bool,
          counterService: bool,
          requireCustomerName: bool,
          requireCustomerPhone: bool,
        },
      },
    }),
    indexes: [{ key: { slug: 1 }, unique: true }],
  },

  user: {
    validator: schema(['tenantId', 'name', 'email', 'passwordHash', 'role', 'active'], {
      tenantId: id,
      name: str,
      email: { bsonType: 'string', pattern: '^[^A-Z]+$' },
      passwordHash: str,
      role: oneOf('MANAGER', 'STAFF'),
      active: bool,
      lastLoginAt: date,
    }),
    indexes: [{ key: { tenantId: 1, email: 1 }, unique: true }],
  },

  table: {
    validator: schema(['tenantId', 'tableNumber', 'active'], {
      tenantId: id,
      tableNumber: { bsonType: 'int', minimum: 1 },
      active: bool,
    }),
    indexes: [{ key: { tenantId: 1, tableNumber: 1 }, unique: true }],
  },

  category: {
    validator: schema(['tenantId', 'name', 'active', 'sortOrder'], {
      tenantId: id,
      name: str,
      active: bool,
      sortOrder: int,
    }),
    indexes: [{ key: { tenantId: 1, active: 1, sortOrder: 1 } }],
  },

  product: {
    validator: schema(['tenantId', 'categoryId', 'name', 'priceCents', 'available', 'sortOrder'], {
      tenantId: id,
      categoryId: id,
      name: str,
      description: str,
      priceCents: cents,
      imageUrl: str,
      available: bool,
      sortOrder: int,
    }),
    indexes: [
      { key: { tenantId: 1, available: 1, sortOrder: 1 } },
      { key: { tenantId: 1, categoryId: 1 } },
    ],
  },

  customerSession: {
    validator: schema(['tenantId', 'customerName', 'lastSeenAt'], {
      tenantId: id,
      customerName: str,
      customerPhone: str,
      tableNumber: { bsonType: 'int', minimum: 1 },
      billId: id,
      lastSeenAt: date,
    }),
    indexes: [{ key: { tenantId: 1, lastSeenAt: 1 } }],
  },

  bill: {
    validator: schema(['tenantId', 'type', 'customerSessionId', 'customerName', 'status', 'totalCents', 'paidCents', 'openedAt'], {
      tenantId: id,
      type: oneOf('TABLE', 'COUNTER'),
      tableNumber: { bsonType: 'int', minimum: 1 },
      customerSessionId: id,
      customerName: str,
      status: oneOf('OPEN', 'CLOSED'),
      totalCents: cents,
      paidCents: cents,
      openedAt: date,
      closedAt: date,
      closedByUserId: id,
      pickupTicket: { bsonType: 'int', minimum: 1 },
    }),
    indexes: [
      { key: { tenantId: 1, status: 1, tableNumber: 1 } },
      { key: { tenantId: 1, openedAt: -1 } },
    ],
  },

  order: {
    validator: schema(['tenantId', 'billId', 'orderNumber', 'customerName', 'status', 'totalCents', 'itemCount', 'sentAt'], {
      tenantId: id,
      billId: id,
      orderNumber: { bsonType: 'int', minimum: 1 },
      tableNumber: { bsonType: 'int', minimum: 1 },
      pickupTicket: { bsonType: 'int', minimum: 1 },
      customerName: str,
      status: oneOf(...ORDER_STATUS),
      totalCents: cents,
      itemCount: { bsonType: 'int', minimum: 1 },
      sentAt: date,
      readyAt: date,
      deliveredAt: date,
    }),
    indexes: [
      { key: { tenantId: 1, status: 1, sentAt: 1 } },
      { key: { tenantId: 1, billId: 1 } },
    ],
  },

  orderItem: {
    validator: schema(['tenantId', 'orderId', 'billId', 'productId', 'productName', 'unitPriceCents', 'quantity', 'subtotalCents'], {
      tenantId: id,
      orderId: id,
      billId: id,
      productId: id,
      productName: str,
      unitPriceCents: cents,
      quantity: { bsonType: 'int', minimum: 1 },
      notes: { bsonType: 'string', maxLength: 200 },
      subtotalCents: cents,
    }),
    indexes: [
      { key: { tenantId: 1, orderId: 1 } },
      { key: { tenantId: 1, billId: 1 } },
    ],
  },

  payment: {
    validator: schema(['tenantId', 'billId', 'method', 'amountCents', 'receivedByUserId', 'paidAt'], {
      tenantId: id,
      billId: id,
      method: oneOf('PIX', 'CASH', 'CARD'),
      amountCents: { bsonType: 'int', minimum: 1 },
      receivedByUserId: id,
      paidAt: date,
    }),
    indexes: [
      { key: { tenantId: 1, billId: 1 } },
      { key: { tenantId: 1, paidAt: -1 } },
    ],
  },

  orderEvent: {
    validator: schema(['tenantId', 'orderId', 'toStatus', 'at'], {
      tenantId: id,
      orderId: id,
      fromStatus: oneOf(...ORDER_STATUS),
      toStatus: oneOf(...ORDER_STATUS),
      userId: id,
      at: date,
    }),
    indexes: [{ key: { tenantId: 1, orderId: 1, at: 1 } }],
  },

  counter: {
    validator: schema(['tenantId', 'name', 'seq'], {
      tenantId: id,
      name: { bsonType: 'string', pattern: '^[a-zA-Z]+:\\d{4}-\\d{2}-\\d{2}$' },
      seq: { bsonType: 'int', minimum: 0 },
    }),
    indexes: [{ key: { tenantId: 1, name: 1 }, unique: true }],
  },
};

const existing = db.getCollectionNames();
for (const [name, def] of Object.entries(collections)) {
  const options = { validator: def.validator, validationLevel: 'strict', validationAction: 'error' };
  if (existing.includes(name)) {
    db.runCommand({ collMod: name, ...options });
  } else {
    db.createCollection(name, options);
  }
  for (const index of def.indexes) {
    const { key, ...indexOptions } = index;
    db.getCollection(name).createIndex(key, indexOptions);
  }
  print(`ok  ${name}`);
}

// Estabelecimento de demonstração. Senha dos dois usuários: pedeai123 (BCrypt, custo 10).
if (db.tenant.findOne({ slug: 'demo' })) {
  print('seed: tenant "demo" já existe, nada inserido');
} else {
  const now = new Date();
  const stamp = { createdAt: now, updatedAt: now };
  const tenantId = new ObjectId();
  const demoPasswordHash = '$2b$10$.2v8n8SVOPbT2U80ICHCqeBsoALrxrHZQZjwqXfHABBeTSH2X5F.q';

  db.tenant.insertOne({
    _id: tenantId,
    slug: 'demo',
    name: 'Bar do Demo',
    active: true,
    branding: { primaryColor: '#111111' },
    settings: { tableService: true, counterService: true, requireCustomerName: true, requireCustomerPhone: false },
    ...stamp,
  });

  db.user.insertMany([
    { tenantId, name: 'Gerente Demo', email: 'gerente@demo.com', passwordHash: demoPasswordHash, role: 'MANAGER', active: true, ...stamp },
    { tenantId, name: 'Funcionário Demo', email: 'funcionario@demo.com', passwordHash: demoPasswordHash, role: 'STAFF', active: true, ...stamp },
  ]);

  const tables = [];
  for (let n = 1; n <= 10; n++) {
    tables.push({ tenantId, tableNumber: NumberInt(n), active: true, ...stamp });
  }
  db.table.insertMany(tables);

  const menu = [
    ['Lanches', [
      ['X-Burger da casa', 'Pão brioche, blend 160 g, queijo e molho especial', 3200],
      ['X-Salada', 'Blend 160 g, alface, tomate e maionese verde', 2900],
      ['Burger de grão-de-bico', 'Pão australiano, rúcula e tomate seco', 3100],
    ]],
    ['Pratos', [
      ['Parmegiana de frango', 'Arroz, fritas e molho de tomate da casa', 4600],
      ['Risoto de cogumelos', 'Arbóreo, shimeji, parmesão e cebolinha', 5200],
    ]],
    ['Bebidas', [
      ['Suco de laranja', 'Natural, 300 ml', 1200],
      ['Refrigerante lata', '350 ml', 700],
      ['Café espresso', 'Grãos especiais, 50 ml', 600],
    ]],
    ['Sobremesas', [
      ['Petit gâteau', 'Com sorvete de creme', 2400],
      ['Pudim de leite', 'Receita da casa', 1400],
    ]],
  ];

  menu.forEach(([categoryName, products], c) => {
    const categoryId = new ObjectId();
    db.category.insertOne({ _id: categoryId, tenantId, name: categoryName, active: true, sortOrder: NumberInt(c + 1), ...stamp });
    db.product.insertMany(products.map(([name, description, priceCents], p) => ({
      tenantId,
      categoryId,
      name,
      description,
      priceCents: NumberInt(priceCents),
      available: true,
      sortOrder: NumberInt(p + 1),
      ...stamp,
    })));
  });

  print(`seed: tenant "demo" criado (${tenantId})`);
}
