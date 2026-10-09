import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { getDb } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./lib/auth/password";

async function main() {
  const db = getDb();
  console.log("Atualizando usuário Mariane no banco...");

  const newHash = hashPassword("232323");
  console.log("Novo hash gerado:", newHash);
  console.log("Teste de verificação:", verifyPassword("232323", newHash));

  const result = await db
    .update(users)
    .set({
      email: "mariane.martins@interno.ponto-or",
      passwordHash: newHash,
      active: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, "efcb156a-8635-41fd-baf1-fbdfc23cd5ae"))
    .returning();

  console.log("Usuário atualizado com sucesso:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao atualizar usuário:", err);
  process.exit(1);
});
