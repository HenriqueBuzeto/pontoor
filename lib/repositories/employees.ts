import { eq, ilike, and, or, isNull, sql, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import type { NewEmployee } from "@/lib/db/schema/employees";

const PAGE_SIZE = 10;

export async function listEmployees(
  tenantId: string,
  opts: { page?: number; search?: string; status?: string } = {}
) {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [eq(employees.tenantId, tenantId), isNull(employees.deletedAt)];
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(employees.status, opts.status));
  }
  if (opts.search?.trim()) {
    const term = `%${opts.search.trim()}%`;
    conditions.push(or(ilike(employees.name, term), ilike(employees.registration, term))!);
  }

  const [list, countResult] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(desc(employees.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(...conditions)),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { list, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getEmployeeById(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id), isNull(employees.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getEmployeeByRegistration(tenantId: string, registration: string) {
  const db = getDb();
  const normalized = registration.trim();
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.tenantId, tenantId), eq(employees.registration, normalized), isNull(employees.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getEmployeeByRegistrationAnyTenant(registration: string) {
  const db = getDb();
  const normalized = registration.trim();
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.registration, normalized), isNull(employees.deletedAt)))
    .orderBy(desc(employees.createdAt))
    .limit(1);
  return row ?? null;
}

export async function createEmployee(tenantId: string, data: NewEmployee) {
  const db = getDb();
  const [created] = await db.insert(employees).values({ ...data, tenantId }).returning();
  return created;
}

export async function updateEmployeeName(tenantId: string, employeeId: string, name: string) {
  const db = getDb();
  const normalized = name.trim();
  if (!normalized) throw new Error("Nome inválido");
  const [updated] = await db
    .update(employees)
    .set({ name: normalized, updatedAt: new Date() })
    .where(and(eq(employees.tenantId, tenantId), eq(employees.id, employeeId), isNull(employees.deletedAt)))
    .returning();
  return updated ?? null;
}

/** Gera próxima matrícula sequencial por tenant (001, 002, 003...). */
export async function getNextEmployeeRegistration(tenantId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({
      max: sql<number>`COALESCE(MAX(COALESCE(NULLIF(regexp_replace(${employees.registration}, '\\D', '', 'g'), ''), '0')::int), 0)`,
    })
    .from(employees)
    .where(eq(employees.tenantId, tenantId));

  const next = (row?.max ?? 0) + 1;
  // Formata com zero à esquerda até 3 dígitos (001, 002...), depois segue normal
  if (next < 1000) return String(next).padStart(3, "0");
  return String(next);
}
