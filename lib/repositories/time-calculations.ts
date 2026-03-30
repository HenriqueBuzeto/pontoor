import { and, eq, gte, lt, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timeCalculations } from "@/lib/db/schema";

export async function listDailyCalculationsByEmployee(
  tenantId: string,
  employeeId: string,
  year: number,
  month: number
) {
  const db = getDb();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toMonth = month === 12 ? 1 : month + 1;
  const toYear = month === 12 ? year + 1 : year;
  const to = `${toYear}-${String(toMonth).padStart(2, "0")}-01`;

  return db
    .select()
    .from(timeCalculations)
    .where(
      and(
        eq(timeCalculations.tenantId, tenantId),
        eq(timeCalculations.employeeId, employeeId),
        gte(timeCalculations.date, from),
        lt(timeCalculations.date, to)
      )
    )
    .orderBy(asc(timeCalculations.date));
}

/** Lista cálculos diários de todos os colaboradores do tenant no mês (para relatórios gerenciais). */
export async function listDailyCalculationsByTenant(
  tenantId: string,
  year: number,
  month: number,
  opts: { employeeId?: string; limit?: number } = {}
) {
  const db = getDb();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toMonth = month === 12 ? 1 : month + 1;
  const toYear = month === 12 ? year + 1 : year;
  const to = `${toYear}-${String(toMonth).padStart(2, "0")}-01`;
  const limit = opts.limit ?? 5000;

  const { employees } = await import("@/lib/db/schema");

  const conditions = [
    eq(timeCalculations.tenantId, tenantId),
    gte(timeCalculations.date, from),
    lt(timeCalculations.date, to),
  ];

  if (opts.employeeId) {
    conditions.push(eq(timeCalculations.employeeId, opts.employeeId));
  }

  return db
    .select({
      id: timeCalculations.id,
      employeeId: timeCalculations.employeeId,
      employeeName: employees.name,
      registration: employees.registration,
      date: timeCalculations.date,
      workedMinutes: timeCalculations.workedMinutes,
      expectedMinutes: timeCalculations.expectedMinutes,
      balanceMinutes: timeCalculations.balanceMinutes,
      overtimeMinutes: timeCalculations.overtimeMinutes,
      lateMinutes: timeCalculations.lateMinutes,
      earlyLeaveMinutes: timeCalculations.earlyLeaveMinutes,
      absent: timeCalculations.absent,
    })
    .from(timeCalculations)
    .leftJoin(employees, eq(timeCalculations.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(asc(timeCalculations.date))
    .limit(limit);
}

