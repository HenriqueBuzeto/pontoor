import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { tenants, users } from "./schema";
import { hashPassword } from "../auth/password";
import { usernameToInternalEmail } from "../auth/constants";
import { userRoles, type UserRole } from "./schema";

function resolveEmailFromLogin(login: string): string {
  const raw = login.trim().toLowerCase();
  return raw.includes("@") ? raw : usernameToInternalEmail(raw);
}

async function main() {
  const db = getDb();

  const login = process.env.ADMIN_LOGIN || process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const requestedRole = (process.env.ADMIN_ROLE || "super_admin").trim();
  const role: UserRole = (userRoles as readonly string[]).includes(requestedRole)
    ? (requestedRole as UserRole)
    : "super_admin";
  const tenantSlug = process.env.TENANT_SLUG;

  if (!login) {
    console.error("Defina ADMIN_LOGIN (ex: meu.usuario ou meu@email.com)");
    process.exit(1);
  }
  if (!password) {
    console.error("Defina ADMIN_PASSWORD");
    process.exit(1);
  }

  if (requestedRole !== role) {
    console.warn(
      `ADMIN_ROLE inválido (${requestedRole}). Usando role padrão: ${role}. Valores aceitos: ${userRoles.join(
        ", "
      )}`
    );
  }

  let tenantId: string | null = null;
  if (tenantSlug) {
    const [t] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);
    tenantId = t?.id ?? null;
    if (!tenantId) {
      console.error(`Tenant não encontrado para TENANT_SLUG=${tenantSlug}`);
      process.exit(1);
    }
  } else {
    const [t] = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants).limit(1);
    tenantId = t?.id ?? null;
    if (!tenantId) {
      console.error("Nenhum tenant encontrado. Rode migrations/seed antes.");
      process.exit(1);
    }
    console.warn(`TENANT_SLUG não definido; usando o primeiro tenant encontrado (${t.slug}).`);
  }

  const email = resolveEmailFromLogin(login);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.id) {
    await db
      .update(users)
      .set({
        tenantId,
        passwordHash: hashPassword(password),
        role,
        active: true,
      })
      .where(eq(users.id, existing.id));

    console.log(`Usuário atualizado: ${email} (role=${role})`);
    return;
  }

  await db.insert(users).values({
    tenantId,
    authId: `local:${email}`,
    email,
    passwordHash: hashPassword(password),
    name: process.env.ADMIN_NAME || "Admin",
    role,
    active: true,
  });

  console.log(`Usuário criado: ${email} (role=${role})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
