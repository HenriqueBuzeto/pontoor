import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { NewUser } from "@/lib/db/schema/users";
import { internalEmailToUsername } from "@/lib/auth/constants";

export async function createUser(data: NewUser) {
  const db = getDb();
  const [created] = await db.insert(users).values(data).returning();
  return created;
}

/** Retorna o conjunto de usernames já usados no tenant (para garantir login único). */
export async function listUsernamesByTenant(tenantId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.tenantId, tenantId));
  const set = new Set<string>();
  for (const r of rows) {
    const username = internalEmailToUsername(r.email);
    if (username) set.add(username);
  }
  return set;
}
