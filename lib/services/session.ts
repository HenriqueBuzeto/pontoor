import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type SessionUser = {
  id: string;
  tenantId: string | null;
  email: string;
  name: string;
  role: string;
  employeeId: string | null;
};

/**
 * Retorna o usuário da tabela users pelo id (auth local).
 */
export async function getSessionUser(userId: string): Promise<SessionUser | null> {
  const db = getDb();
  const [u] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      name: users.name,
      role: users.role,
      employeeId: users.employeeId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u ?? null;
}
