import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workSchedules, scales } from "@/lib/db/schema";

export async function listWorkSchedules(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(workSchedules)
    .where(eq(workSchedules.tenantId, tenantId))
    .orderBy(asc(workSchedules.name));
}

export async function listScales(tenantId: string) {
  const db = getDb();
  return db.select().from(scales).where(eq(scales.tenantId, tenantId)).orderBy(asc(scales.name));
}
