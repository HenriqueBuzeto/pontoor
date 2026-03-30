import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { employees } from "./employees";
import { users } from "./users";

export const adjustmentTypes = [
  "late",           // atraso
  "absence",        // falta
  "forgot_mark",    // esquecimento
  "early_leave",    // saída antecipada
  "external_work",  // trabalho externo
  "justified_absence", // falta justificada / atestado (não contabiliza horas)
  "other",
] as const;
export type AdjustmentType = (typeof adjustmentTypes)[number];

export const approvalStatuses = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

export const adjustments = pgTable("adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull().$type<AdjustmentType>(),
  reason: text("reason").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  timeEntryId: uuid("time_entry_id"), // se for ajuste de marcação específica
  requestedById: uuid("requested_by_id").references(() => users.id),
  status: varchar("status", { length: 20 }).default("pending").notNull().$type<ApprovalStatus>(),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adjustmentAttachments = pgTable("adjustment_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  adjustmentId: uuid("adjustment_id").references(() => adjustments.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Adjustment = typeof adjustments.$inferSelect;
export type NewAdjustment = typeof adjustments.$inferInsert;
export type AdjustmentAttachment = typeof adjustmentAttachments.$inferSelect;
