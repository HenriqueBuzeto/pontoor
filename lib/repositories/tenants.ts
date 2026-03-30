import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import type { NewTenant } from "@/lib/db/schema/tenants";

export async function getTenantById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return row ?? null;
}

export async function updateTenant(
  id: string,
  data: Partial<Pick<NewTenant, "name" | "slug" | "settings" | "active">>
) {
  const db = getDb();
  const [updated] = await db
    .update(tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();
  return updated ?? null;
}
