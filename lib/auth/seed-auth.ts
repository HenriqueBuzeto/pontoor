/**
 * Cria o usuário de teste no Supabase Auth e na tabela users do banco.
 * Execute uma vez: npm run db:seed-auth (ou tsx lib/auth/seed-auth.ts)
 *
 * Requer no .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - DATABASE_URL
 *
 * Usuário de teste padrão: henrique.ti
 * A senha pode ser alterada depois diretamente no painel do Supabase.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Carrega .env.local quando o script roda via npm run (Next.js não carrega .env.local em scripts Node)
config({ path: resolve(process.cwd(), ".env.local") });

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tenants, users, employees } from "@/lib/db/schema";
import { usernameToInternalEmail } from "./constants";
import { hashPassword } from "@/lib/auth/password";

const TEST_USERNAME = "henrique.ti";
const TEST_PASSWORD = "Hiqueti03@";
const TEST_NAME = "Henrique (TI)";

async function seedAuth() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Defina DATABASE_URL em .env.local (connection string do PostgreSQL/Supabase)");
    process.exit(1);
  }

  const email = usernameToInternalEmail(TEST_USERNAME);
  const authId = `local:${email}`;

  await ensureTenantAndUser(authId);
  console.log("\nUsuário de teste criado com sucesso.");
  console.log("Login de acesso: henrique.ti");
}

async function ensureTenantAndUser(authId: string) {
  const db = getDb();

  // Mantemos um único tenant padrão com slug "otica-renata"
  const slug = "otica-renata";
  const existingTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  let tenantId: string;
  if (existingTenants.length > 0) {
    tenantId = existingTenants[0].id;
  } else {
    const [tenantRow] = await db
      .insert(tenants)
      .values({
        name: "Ótica Renata",
        slug,
        document: null,
        plan: "professional",
        active: true,
      })
      .returning({ id: tenants.id });
    tenantId = tenantRow.id;
    console.log("Tenant padrão criado.");
  }

  const existingUser = await db
    .select({ id: users.id, employeeId: users.employeeId })
    .from(users)
    .where(eq(users.authId, authId))
    .limit(1);

  // Garante que exista um colaborador (employees) para este usuário admin/super_admin
  let employeeId: string;
  if (existingUser.length > 0 && existingUser[0].employeeId) {
    employeeId = existingUser[0].employeeId;
  } else {
    const registration = "ADM001";
    const email = usernameToInternalEmail(TEST_USERNAME);
    const today = new Date();
    const admissionDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const [employeeRow] = await db
      .insert(employees)
      .values({
        tenantId,
        registration,
        name: TEST_NAME,
        email,
        cpf: "00000000000",
        admissionDate,
        status: "active",
      })
      .returning({ id: employees.id });

    employeeId = employeeRow.id;
  }

  if (existingUser.length > 0) {
    await db
      .update(users)
      .set({
        tenantId,
        employeeId,
      })
      .where(eq(users.id, existingUser[0].id));
    console.log("Usuário já existente atualizado com tenant e employeeId.");
    return;
  }

  await db.insert(users).values({
    tenantId,
    authId,
    email: usernameToInternalEmail(TEST_USERNAME),
    passwordHash: hashPassword(TEST_PASSWORD),
    name: TEST_NAME,
    role: "super_admin",
    active: true,
    employeeId,
  });
  console.log("Usuário de sistema (users) e colaborador criados e vinculados ao tenant.");
}

seedAuth().catch((e) => {
  console.error(e);
  process.exit(1);
});
