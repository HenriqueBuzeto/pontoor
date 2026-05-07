import { and, eq, gte, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { vacations } from "@/lib/db/schema";

export async function listVacationsByEmployee(tenantId: string, employeeId: string) {
  const db = getDb();
  try {
    return await db
      .select({ id: vacations.id, startDate: vacations.startDate, endDate: vacations.endDate })
      .from(vacations)
      .where(and(eq(vacations.tenantId, tenantId), eq(vacations.employeeId, employeeId)))
      .orderBy(vacations.startDate);
  } catch (e) {
    console.error("[vacations] listVacationsByEmployee failed", e);
    return [];
  }
}

export async function listVacationsByRange(tenantId: string, startDate: string, endDate: string) {
  const db = getDb();
  try {
    return await db
      .select({ employeeId: vacations.employeeId, startDate: vacations.startDate, endDate: vacations.endDate })
      .from(vacations)
      .where(
        and(
          eq(vacations.tenantId, tenantId),
          or(
            and(gte(vacations.startDate, startDate), lte(vacations.startDate, endDate)),
            and(gte(vacations.endDate, startDate), lte(vacations.endDate, endDate)),
            and(lte(vacations.startDate, startDate), gte(vacations.endDate, endDate))
          )
        )
      )
      .orderBy(vacations.startDate);
  } catch (e) {
    console.error("[vacations] listVacationsByRange failed", e);
    return [];
  }
}

export async function isOnVacation(tenantId: string, employeeId: string, dateKey: string): Promise<boolean> {
  const db = getDb();
  try {
    const [row] = await db
      .select({ id: vacations.id })
      .from(vacations)
      .where(
        and(
          eq(vacations.tenantId, tenantId),
          eq(vacations.employeeId, employeeId),
          lte(vacations.startDate, dateKey),
          gte(vacations.endDate, dateKey)
        )
      )
      .limit(1);
    return !!row;
  } catch (e) {
    console.error("[vacations] isOnVacation failed", e);
    return false;
  }
}

export async function createVacation(tenantId: string, employeeId: string, startDate: string, endDate: string) {
  const db = getDb();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Data inicial inválida");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Data final inválida");
  if (endDate < startDate) throw new Error("Data final não pode ser menor que a data inicial");

  const [row] = await db
    .insert(vacations)
    .values({ tenantId, employeeId, startDate, endDate })
    .onConflictDoNothing({ target: [vacations.tenantId, vacations.employeeId, vacations.startDate, vacations.endDate] })
    .returning();
  return row ?? null;
}

export async function deleteVacation(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .delete(vacations)
    .where(and(eq(vacations.tenantId, tenantId), eq(vacations.id, id)))
    .returning({ id: vacations.id });
  return row ?? null;
}
