// Somente banco de desenvolvimento. Não executar em produção ou loja real.
// Repara apenas senha e bloqueio das quatro contas conhecidas da demonstração.
// Não recria usuários, não altera perfis e não apaga pedidos, mesas ou comandas.
// PowerShell, na raiz do projeto:
// $env:PEDEAI_ALLOW_DEMO_PASSWORD_RESET="true"
// mongosh "mongodb://localhost:27017/pedeai" banco/repair-demo-passwords.js
// Remove-Item Env:PEDEAI_ALLOW_DEMO_PASSWORD_RESET

if (process.env.PEDEAI_ALLOW_DEMO_PASSWORD_RESET !== "true") {
  throw new Error("Reparo bloqueado. Confirme que é um banco de desenvolvimento e defina PEDEAI_ALLOW_DEMO_PASSWORD_RESET=true.");
}

const DB = db.getSiblingDB(db.getName());
const store = DB.store.findOne({ slug: "triunfo-lanches" });
if (!store) {
  throw new Error("Loja triunfo-lanches não encontrada neste banco. Nenhum usuário foi alterado.");
}

const result = DB.user.updateMany(
  {
    storeId: store._id,
    $or: [
      { email: "marcos@triunfolanches.com", role: "OWNER" },
      { email: "paula@triunfolanches.com", role: "MANAGER" },
      { email: "rafa@triunfolanches.com", role: "WAITER" },
      { email: "ze@triunfolanches.com", role: "KITCHEN" }
    ]
  },
  {
    $set: {
      passwordHash: "$2b$12$r1/NdlRpM57O/A5BIma0ievEHseD27XMJIdRMSAmSS1Pg5/A.M1zS",
      failedAttempts: NumberInt(0)
    },
    $unset: { lockedUntil: "" }
  }
);
printjson(result);
if (result.matchedCount === 0) {
  throw new Error("Nenhuma conta de demonstração encontrada. Confira os dados e o banco configurado no backend.");
}
print("Contas de demonstração encontradas: " + result.matchedCount + ". Senha de desenvolvimento: pedeai123. Bloqueios removidos.");
