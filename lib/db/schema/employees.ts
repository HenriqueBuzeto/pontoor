import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { branches } from "./organizations";
import { departments, teams, roles, costCenters } from "./organizations";
import { workSchedules } from "./work-schedules";

export const contractTypes = [
  "clt",
  "pj",
  "estagiario",
  "aprendiz",
  "temporario",
  "cooperado",
] as const;
export type ContractType = (typeof contractTypes)[number];

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  registration: varchar("registration", { length: 50 }).notNull(), // matrícula
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  cpf: varchar("cpf", { length: 14 }).notNull(), // armazenado sem máscara
  birthDate: date("birth_date"),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
  managerId: uuid("manager_id"), // self-reference
  workScheduleId: uuid("work_schedule_id").references(() => workSchedules.id, { onDelete: "set null" }),
  admissionDate: date("admission_date").notNull(),
  resignationDate: date("resignation_date"),
  contractType: varchar("contract_type", { length: 50 }).$type<ContractType>().default("clt"),
  photoUrl: text("photo_url"),
  toleranceMinutesLate: varchar("tolerance_minutes_late", { length: 10 }).default("0"), // específico do colaborador
  toleranceMinutesEarlyLeave: varchar("tolerance_minutes_early_leave", { length: 10 }).default("0"),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, inactive, on_leave
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete
});

export const employeeHistory = pgTable("employee_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  changedBy: uuid("changed_by").references(() => employees.id),
  field: varchar("field", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type EmployeeHistory = typeof employeeHistory.$inferSelect;
