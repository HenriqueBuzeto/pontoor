import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionCookieName, verifySignedSessionValue } from "@/lib/auth/session-cookie";

export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(getSessionCookieName())?.value;
  if (!raw) return null;
  return verifySignedSessionValue(raw);
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const db = getDb();
  const [u] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      name: users.name,
      role: users.role,
      employeeId: users.employeeId,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u?.id || !u.active) return null;
  return u;
}
