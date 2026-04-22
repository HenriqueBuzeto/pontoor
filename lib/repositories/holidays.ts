import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { holidays } from "@/lib/db/schema";

export async function listHolidaysByRange(tenantId: string, startDate: string, endDate: string) {
  const db = getDb();
  return db
    .select({ date: holidays.date, name: holidays.name })
    .from(holidays)
    .where(and(eq(holidays.tenantId, tenantId), gte(holidays.date, startDate), lte(holidays.date, endDate)))
    .orderBy(holidays.date);
}

export async function isManualHoliday(tenantId: string, dateKey: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ date: holidays.date })
    .from(holidays)
    .where(and(eq(holidays.tenantId, tenantId), eq(holidays.date, dateKey)))
    .limit(1);
  return !!row;
}

export async function createHoliday(tenantId: string, dateKey: string, name: string) {
  const db = getDb();
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Nome inválido");
  const [row] = await db
    .insert(holidays)
    .values({ tenantId, date: dateKey, name: normalizedName })
    .onConflictDoUpdate({
      target: [holidays.tenantId, holidays.date],
      set: { name: normalizedName },
    })
    .returning();
  return row ?? null;
}

export async function deleteHoliday(tenantId: string, dateKey: string) {
  const db = getDb();
  const [row] = await db
    .delete(holidays)
    .where(and(eq(holidays.tenantId, tenantId), eq(holidays.date, dateKey)))
    .returning({ date: holidays.date });
  return row ?? null;
}
