import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adjustments } from "@/lib/db/schema";
import type { NewAdjustment } from "@/lib/db/schema/adjustments";
import { employees } from "@/lib/db/schema";

export async function listAdjustments(
  tenantId: string,
  opts: { status?: "pending" | "approved" | "rejected" | "all"; limit?: number; employeeId?: string } = {}
) {
  const db = getDb();
  const limit = opts.limit ?? 50;
  const conditions = [eq(adjustments.tenantId, tenantId)];
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(adjustments.status, opts.status));
  }
  if (opts.employeeId) {
    conditions.push(eq(adjustments.employeeId, opts.employeeId));
  }

  const list = await db
    .select({
      id: adjustments.id,
      employeeId: adjustments.employeeId,
      employeeName: employees.name,
      type: adjustments.type,
      reason: adjustments.reason,
      date: adjustments.date,
      status: adjustments.status,
      createdAt: adjustments.createdAt,
    })
    .from(adjustments)
    .leftJoin(employees, eq(adjustments.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(desc(adjustments.createdAt))
    .limit(limit);

  return list;
}

export async function getAdjustmentById(tenantId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: adjustments.id,
      employeeId: adjustments.employeeId,
      employeeName: employees.name,
      type: adjustments.type,
      reason: adjustments.reason,
      date: adjustments.date,
      status: adjustments.status,
      reviewComment: adjustments.reviewComment,
      createdAt: adjustments.createdAt,
    })
    .from(adjustments)
    .leftJoin(employees, eq(adjustments.employeeId, employees.id))
    .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.id, id)))
    .limit(1);
  return row ?? null;
}

export async function reviewAdjustment(
  tenantId: string,
  adjustmentId: string,
  data: { status: "approved" | "rejected"; reviewedById: string; reviewComment?: string }
) {
  const db = getDb();
  const [updated] = await db
    .update(adjustments)
    .set({
      status: data.status,
      reviewedById: data.reviewedById,
      reviewedAt: new Date(),
      reviewComment: data.reviewComment ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.id, adjustmentId)))
    .returning();
  return updated ?? null;
}

export async function createAdjustment(
  tenantId: string,
  data: Omit<NewAdjustment, "tenantId" | "createdAt" | "updatedAt">
) {
  const db = getDb();
  const [created] = await db
    .insert(adjustments)
    .values({
      ...data,
      tenantId,
      // status, createdAt e updatedAt usam default do banco se não forem passados
    })
    .returning();
  return created ?? null;
}
