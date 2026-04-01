import { eq, asc, and } from "drizzle-orm";
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

export async function getWorkScheduleById(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.tenantId, tenantId), eq(workSchedules.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listScales(tenantId: string) {
  const db = getDb();
  return db.select().from(scales).where(eq(scales.tenantId, tenantId)).orderBy(asc(scales.name));
}
