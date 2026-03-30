import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hourBankBalances, hourBankTransactions } from "@/lib/db/schema";
import { employees } from "@/lib/db/schema";

export async function getEmployeeBalance(tenantId: string, employeeId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(hourBankBalances)
    .where(
      and(
        eq(hourBankBalances.tenantId, tenantId),
        eq(hourBankBalances.employeeId, employeeId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function listHourBankTransactions(
  tenantId: string,
  employeeId: string,
  opts: { limit?: number; year?: number; month?: number } = {}
) {
  const db = getDb();
  const limit = opts.limit ?? 30;

  const conditions = [
    eq(hourBankTransactions.tenantId, tenantId),
    eq(hourBankTransactions.employeeId, employeeId),
  ];

  if (opts.year && opts.month) {
    const year = opts.year;
    const month = opts.month; // 1-12
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    conditions.push(gte(hourBankTransactions.createdAt, from));
    conditions.push(lt(hourBankTransactions.createdAt, to));
  }

  return db
    .select()
    .from(hourBankTransactions)
    .where(and(...conditions))
    .orderBy(desc(hourBankTransactions.createdAt))
    .limit(limit);
}

export async function listAllBalances(tenantId: string) {
  const db = getDb();
  return db
    .select({
      employeeId: hourBankBalances.employeeId,
      employeeName: employees.name,
      balanceMinutes: hourBankBalances.balanceMinutes,
    })
    .from(hourBankBalances)
    .leftJoin(employees, eq(hourBankBalances.employeeId, employees.id))
    .where(eq(hourBankBalances.tenantId, tenantId));
}

/** Aplica um ajuste de banco de horas em minutos (pode ser positivo ou negativo). */
export async function applyHourBankAdjustment(
  tenantId: string,
  employeeId: string,
  amountMinutes: number,
  opts: { referenceType?: string; referenceId?: string; note?: string; approvedById?: string } = {}
) {
  const db = getDb();

  // Garante registro de saldo
  let balance = await getEmployeeBalance(tenantId, employeeId);
  if (!balance) {
    const [created] = await db
      .insert(hourBankBalances)
      .values({
        tenantId,
        employeeId,
        balanceMinutes: 0,
      })
      .returning();
    balance = created;
  }

  const newBalance = (balance?.balanceMinutes ?? 0) + amountMinutes;

  await db.transaction(async (tx) => {
    await tx.insert(hourBankTransactions).values({
      tenantId,
      employeeId,
      type: "adjustment",
      amountMinutes,
      balanceAfterMinutes: newBalance,
      referenceType: opts.referenceType ?? "adjustment",
      referenceId: opts.referenceId,
      approvedById: opts.approvedById,
      approvedAt: new Date(),
      note: opts.note ?? null,
    });

    await tx
      .update(hourBankBalances)
      .set({
        balanceMinutes: newBalance,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hourBankBalances.tenantId, tenantId),
          eq(hourBankBalances.employeeId, employeeId)
        )
      );
  });
}
