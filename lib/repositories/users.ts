import { and, eq } from "drizzle-orm";
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

export async function updateUserName(userId: string, name: string) {
  const db = getDb();
  const normalized = name.trim();
  if (!normalized) throw new Error("Nome inválido");
  const [updated] = await db
    .update(users)
    .set({ name: normalized, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function getUserByEmployeeId(tenantId: string, employeeId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.employeeId, employeeId)))
    .limit(1);
  return row ?? null;
}
