import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import type { NewTimeEntry } from "@/lib/db/schema/time-entries";

export async function createTimeEntry(
  tenantId: string,
  employeeId: string,
  data: {
    type: NewTimeEntry["type"];
    occurredAt: Date;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
    observation?: string;
  }
) {
  const db = getDb();
  const [entry] = await db
    .insert(timeEntries)
    .values({
      tenantId,
      employeeId,
      type: data.type,
      occurredAt: data.occurredAt,
      source: data.source ?? "web",
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      observation: data.observation ?? null,
    })
    .returning();
  return entry;
}

export async function listTimeEntriesByEmployee(
  tenantId: string,
  employeeId: string,
  start: Date,
  end: Date
) {
  const db = getDb();
  return db.query.timeEntries.findMany({
    where: (te, { and, eq, gte, lte }) =>
      and(
        eq(te.tenantId, tenantId),
        eq(te.employeeId, employeeId),
        gte(te.occurredAt, start),
        lte(te.occurredAt, end)
      ),
    orderBy: (te, { asc }) => [asc(te.occurredAt)],
  });
}

/** Lista marcações de todos os colaboradores do tenant no período (relatórios empresariais). */
export async function listTimeEntriesByTenant(
  tenantId: string,
  start: Date,
  end: Date,
  opts: { employeeId?: string; limit?: number } = {}
) {
  const db = getDb();
  const limit = opts.limit ?? 500;
  const conditions = [
    eq(timeEntries.tenantId, tenantId),
    gte(timeEntries.occurredAt, start),
    lte(timeEntries.occurredAt, end),
  ];
  if (opts.employeeId) {
    conditions.push(eq(timeEntries.employeeId, opts.employeeId));
  }
  const { employees } = await import("@/lib/db/schema");
  const rows = await db
    .select({
      id: timeEntries.id,
      employeeId: timeEntries.employeeId,
      employeeName: employees.name,
      registration: employees.registration,
      type: timeEntries.type,
      occurredAt: timeEntries.occurredAt,
      source: timeEntries.source,
    })
    .from(timeEntries)
    .leftJoin(employees, eq(timeEntries.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(asc(timeEntries.occurredAt))
    .limit(limit);
  return rows;
}

/** Substitui todas as marcações de um dia por um novo conjunto de marcações. */
export async function overwriteTimeEntriesForDay(
  tenantId: string,
  employeeId: string,
  date: Date,
  items: { type: NewTimeEntry["type"]; occurredAt: Date }[]
) {
  const db = getDb();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  await db.transaction(async (tx) => {
    await tx
      .delete(timeEntries)
      .where(
        and(
          eq(timeEntries.tenantId, tenantId),
          eq(timeEntries.employeeId, employeeId),
          gte(timeEntries.occurredAt, start),
          lte(timeEntries.occurredAt, end)
        )
      );

    if (items.length === 0) return;

    await tx.insert(timeEntries).values(
      items.map((it) => ({
        tenantId,
        employeeId,
        type: it.type,
        occurredAt: it.occurredAt,
        source: "manual_adjustment",
        ipAddress: null,
        userAgent: null,
        observation: "Ajuste aprovado pelo administrador",
      }))
    );
  });
}
