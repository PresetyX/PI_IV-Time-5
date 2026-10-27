// Pede Aí · semente de desenvolvimento
// Uso: mongosh "<string de conexao>" banco/seed.js
// Apaga e recria os dados da casa de exemplo. Não rode em produção.
//
// A senha de todos os usuários é "pedeai123". O hash abaixo é BCrypt com custo 12.
// Somente desenvolvimento: nunca reutilize essa senha em produção.

const DB = db.getSiblingDB(db.getName());
const SENHA = "$2b$12$r1/NdlRpM57O/A5BIma0ievEHseD27XMJIdRMSAmSS1Pg5/A.M1zS";
const SLUG = "triunfo-lanches";
const agora = new Date();

function dataEm(minutos) {
  return new Date(agora.getTime() + minutos * 60000);
}

// ---------------------------------------------------------------- limpeza
const antigo = DB.store.findOne({ slug: SLUG });
if (antigo) {
  ["user", "table", "category", "product", "guestSession", "tab", "order",
   "payment", "commission", "cashDay", "orderEvent", "tableChange", "waitlist"]
    .forEach(function (c) { DB.getCollection(c).deleteMany({ storeId: antigo._id }); });
  DB.sequence.deleteMany({ _id: { $regex: "^" + antigo._id.str } });
  DB.store.deleteOne({ _id: antigo._id });
  print("limpei os dados anteriores de " + SLUG);
}

// ---------------------------------------------------------------- store
const horario = [];
for (var d = 0; d <= 6; d++) {
  horario.push({ weekday: d, opensAt: "17:00", closesAt: d === 5 || d === 6 ? "01:00" : "23:00", lastOrderAt: "22:30" });
}
const storeId = DB.store.insertOne({
  slug: SLUG,
  name: "Triunfo Lanches",
  kind: "LANCHONETE",
  phone: "(19) 3333-0000",
  address: { street: "Rua das Palmeiras", number: "320", district: "Centro", city: "Campinas", state: "SP", zip: "13010-000" },
  primaryColor: "#D62F1F",
  tagline: "Lanche na chapa, batata na hora e milk-shake de verdade.",
  openingHours: horario,
  serviceModes: ["TABLE", "COUNTER"],
  serviceFeeBasisPoints: NumberInt(1000),
  commissionBasisPoints: NumberInt(500),
  requireCustomerPhone: true,
  isTraining: false,
  active: true,
  createdAt: agora
}).insertedId;
print("loja        " + SLUG);

// ---------------------------------------------------------------- usuários
const usuarios = [
  { name: "Marcos Lima", email: "marcos@triunfolanches.com", role: "OWNER" },
  { name: "Paula Reis", email: "paula@triunfolanches.com", role: "MANAGER" },
  { name: "Rafa Souza", email: "rafa@triunfolanches.com", role: "WAITER" },
  { name: "Zé da Cozinha", email: "ze@triunfolanches.com", role: "KITCHEN" }
];
const userIds = {};
usuarios.forEach(function (u) {
  userIds[u.role] = DB.user.insertOne({
    storeId: storeId, name: u.name, email: u.email, passwordHash: SENHA,
    role: u.role, active: true, mustChangePassword: false,
    failedAttempts: NumberInt(0), createdAt: agora
  }).insertedId;
});
print("usuários    4 (senha pedeai123)");

// ---------------------------------------------------------------- mesas
const mesas = [];
[1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12].forEach(function (n, i) {
  const num = ("0" + n).slice(-2);
  mesas.push(DB.table.insertOne({
    storeId: storeId,
    number: NumberInt(n),
    nickname: i < 3 ? "Janela" : (i < 7 ? "Centro" : "Varanda"),
    seats: NumberInt(n % 3 === 0 ? 6 : 4),
    token: "t" + num + "-" + Math.random().toString(16).slice(2, 6),
    active: n !== 11,
    createdAt: agora
  }).insertedId);
});
print("mesas       11");

// ---------------------------------------------------------------- cardápio
const categorias = [
  { name: "Lanches", position: 0 },
  { name: "Porções", position: 1 },
  { name: "Bebidas", position: 2 },
  { name: "Sobremesas", position: 3 }
];
const catIds = {};
categorias.forEach(function (c) {
  catIds[c.name] = DB.category.insertOne({
    storeId: storeId, name: c.name, position: NumberInt(c.position), visible: true
  }).insertedId;
});

const produtos = [
  { cat: "Lanches", name: "X-salada", desc: "Pão, hambúrguer de 150 g, queijo, alface e tomate.", preco: 2800, prep: 12 },
  { cat: "Lanches", name: "X-bacon", desc: "Hambúrguer de 150 g, bacon crocante e queijo cheddar.", preco: 3200, prep: 12 },
  { cat: "Lanches", name: "Sanduíche de pernil", desc: "Pernil desfiado no pão francês, com vinagrete.", preco: 2600, prep: 10 },
  { cat: "Lanches", name: "Triunfo duplo", desc: "Dois hambúrgueres, queijo duplo e molho da casa.", preco: 3900, prep: 15,
    opcoes: [
      { name: "Ponto da carne", required: true, min: 1, max: 1,
        options: [{ label: "Ao ponto", deltaCents: 0 }, { label: "Bem passado", deltaCents: 0 }] },
      { name: "Adicionais", required: false, min: 0, max: 3,
        options: [{ label: "Bacon extra", deltaCents: 600 }, { label: "Cheddar extra", deltaCents: 500 }, { label: "Ovo", deltaCents: 300 }] }
    ] },
  { cat: "Porções", name: "Batata frita", desc: "500 g de batata rústica com sal grosso.", preco: 3200, prep: 15,
    opcoes: [
      { name: "Tamanho", required: true, min: 1, max: 1,
        options: [{ label: "Meia porção", deltaCents: -1200 }, { label: "Porção inteira", deltaCents: 0 }] }
    ] },
  { cat: "Porções", name: "Calabresa acebolada", desc: "Com pão de alho.", preco: 3800, prep: 18 },
  { cat: "Porções", name: "Nuggets", desc: "12 unidades com molho barbecue.", preco: 2400, prep: 12 },
  { cat: "Bebidas", name: "Refrigerante lata", desc: "350 ml gelado.", preco: 800, prep: 1 },
  { cat: "Bebidas", name: "Suco de laranja", desc: "500 ml, feito na hora.", preco: 1200, prep: 5 },
  { cat: "Bebidas", name: "Milk-shake", desc: "400 ml de chocolate, morango ou baunilha.", preco: 1800, prep: 8 },
  { cat: "Bebidas", name: "Cerveja long neck", desc: "330 ml.", preco: 1200, prep: 1, alcool: true },
  { cat: "Sobremesas", name: "Pudim", desc: "Fatia caseira.", preco: 1300, prep: 2, esgotado: true },
  { cat: "Sobremesas", name: "Petit gateau", desc: "Com sorvete de creme.", preco: 2200, prep: 10 }
];
produtos.forEach(function (p, i) {
  const doc = {
    storeId: storeId,
    categoryId: catIds[p.cat],
    name: p.name,
    description: p.desc,
    priceCents: NumberInt(p.preco),
    prepMinutes: NumberInt(p.prep),
    available: !p.esgotado,
    isAlcoholic: !!p.alcool,
    position: NumberInt(i),
    optionGroups: p.opcoes || []
  };
  // só grava a data quando o item está mesmo esgotado: o validador não aceita null
  if (p.esgotado) { doc.unavailableSince = agora; }
  DB.product.insertOne(doc);
});
print("cardápio    4 categorias, " + produtos.length + " produtos");

// ---------------------------------------------------------------- uma comanda aberta, para o front ter o que mostrar
const sessionId = DB.guestSession.insertOne({
  storeId: storeId, tableId: mesas[3], mode: "TABLE",
  name: "Ana", phone: "(19) 99999-0000",
  consent: { notify: true, history: false, at: agora },
  createdAt: agora, expiresAt: dataEm(240)
}).insertedId;

const tabId = DB.tab.insertOne({
  storeId: storeId, tableId: mesas[3], mode: "TABLE", customerName: "Ana",
  ownerSessionId: sessionId, managedBy: "CUSTOMER",
  participants: [], status: "OPEN",
  subtotalCents: NumberInt(6000), serviceFeeCents: NumberInt(600),
  discountCents: NumberInt(0), totalCents: NumberInt(6600), paidCents: NumberInt(0),
  openedAt: agora
}).insertedId;

const prodBatata = DB.product.findOne({ storeId: storeId, name: "Batata frita" });
const prodRefri = DB.product.findOne({ storeId: storeId, name: "Refrigerante lata" });

DB.sequence.updateOne(
  { _id: storeId.str + ":" + agora.toISOString().slice(0, 10) + ":order" },
  { $inc: { seq: NumberInt(1) } },
  { upsert: true }
);

const orderId = DB.order.insertOne({
  storeId: storeId, tabId: tabId, tableId: mesas[3],
  number: NumberInt(1), status: "PREPARING", ageConfirmed: false,
  items: [
    { productId: prodBatata._id, nameSnapshot: prodBatata.name, unitPriceCents: NumberInt(3200),
      quantity: NumberInt(1), note: "Sem sal", options: [], status: "PREPARING",
      placedByType: "CUSTOMER", placedBySessionId: sessionId },
    { productId: prodRefri._id, nameSnapshot: prodRefri.name, unitPriceCents: NumberInt(800),
      quantity: NumberInt(2), note: "", options: [], status: "DELIVERED",
      placedByType: "CUSTOMER", placedBySessionId: sessionId }
  ],
  totalCents: NumberInt(4800),
  createdAt: agora
}).insertedId;

DB.orderEvent.insertOne({ storeId: storeId, orderId: orderId, type: "CREATED", at: agora });
print("exemplo     1 sessão, 1 comanda aberta e 1 pedido em preparo");

print("");
print("Pronto. Entre com marcos@triunfolanches.com / pedeai123");
print("Mesa de teste: " + DB.table.findOne({ storeId: storeId, number: 5 }).token);
