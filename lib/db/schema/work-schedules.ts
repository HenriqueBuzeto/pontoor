import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  time,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./organizations";

export const scheduleTypes = [
  "fixed",       // jornada fixa
  "flexible",    // flexível
  "scale_5x2",   // 5x2
  "scale_6x1",   // 6x1
  "scale_12x36", // 12x36
  "partial",     // parcial
  "remote",      // remoto
  "custom",
] as const;
export type ScheduleType = (typeof scheduleTypes)[number];

export const workSchedules = pgTable("work_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  type: varchar("type", { length: 50 }).notNull().$type<ScheduleType>(),
  entryTime: time("entry_time"),
  exitTime: time("exit_time"),
  breakStart: time("break_start"),
  breakEnd: time("break_end"),
  breakMinutes: integer("break_minutes").default(60),
  toleranceLateMinutes: integer("tolerance_late_minutes").default(0),
  toleranceEarlyLeaveMinutes: integer("tolerance_early_leave_minutes").default(0),
  toleranceMarkMinutes: integer("tolerance_mark_minutes").default(0),
  dailyHours: integer("daily_hours").default(8), // em minutos
  weeklyHours: integer("weekly_hours").default(44), // em minutos (44h semanal)
  overtimeRule: varchar("overtime_rule", { length: 50 }).default("bank"), // bank, pay, mixed
  nightShiftStart: time("night_shift_start"), // 22:00 para adicional noturno
  nightShiftEnd: time("night_shift_end"),   // 05:00
  workDays: jsonb("work_days").$type<number[]>().default([1, 2, 3, 4, 5]), // 0=dom..6=sáb
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scales = pgTable("scales", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  workScheduleId: uuid("work_schedule_id").references(() => workSchedules.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  pattern: varchar("pattern", { length: 50 }).notNull(), // 5x2, 6x1, 12x36
  cycleDays: integer("cycle_days"),
  workDaysInCycle: integer("work_days_in_cycle"),
  restDaysInCycle: integer("rest_days_in_cycle"),
  definition: jsonb("definition").$type<Array<{ day: number; entry?: string; exit?: string; breakStart?: string; breakEnd?: string }>>(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scaleAssignments = pgTable("scale_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").notNull(), // FK em employees
  scaleId: uuid("scale_id").references(() => scales.id, { onDelete: "cascade" }).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WorkSchedule = typeof workSchedules.$inferSelect;
export type Scale = typeof scales.$inferSelect;
export type ScaleAssignment = typeof scaleAssignments.$inferSelect;
