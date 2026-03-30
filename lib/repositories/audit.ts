import { eq, and, desc, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function listAuditLogs(
  tenantId: string | null,
  opts: { entity?: string; limit?: number; from?: Date; to?: Date } = {}
) {
  const db = getDb();
  const limit = opts.limit ?? 50;
  const conditions = [];
  if (tenantId != null) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }
  if (opts.entity) {
    conditions.push(eq(auditLogs.entity, opts.entity));
  }
  if (opts.from) {
    conditions.push(gte(auditLogs.createdAt, opts.from));
  }
  if (opts.to) {
    conditions.push(lte(auditLogs.createdAt, opts.to));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
