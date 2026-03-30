import {
  pgTable,
  uuid,
  integer,
  timestamp,
  date,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { employees } from "./employees";
import { users } from "./users";

export const timeCalculations = pgTable("time_calculations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  workedMinutes: integer("worked_minutes").default(0),
  expectedMinutes: integer("expected_minutes").default(0),
  balanceMinutes: integer("balance_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  lateMinutes: integer("late_minutes").default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  absent: boolean("absent").default(false),
  nightShiftMinutes: integer("night_shift_minutes").default(0),
  breakDeficitMinutes: integer("break_deficit_minutes").default(0),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const periodClosures = pgTable("period_closures", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedById: uuid("closed_by_id").references(() => users.id),
  version: integer("version").default(1).notNull(),
  reopenedAt: timestamp("reopened_at", { withTimezone: true }),
  reopenedById: uuid("reopened_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const closureVersions = pgTable("closure_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  periodClosureId: uuid("period_closure_id").references(() => periodClosures.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TimeCalculation = typeof timeCalculations.$inferSelect;
export type PeriodClosure = typeof periodClosures.$inferSelect;
export type ClosureVersion = typeof closureVersions.$inferSelect;
