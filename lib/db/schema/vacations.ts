import { pgTable, uuid, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { employees } from "./employees";

export const vacations = pgTable(
  "vacations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    employeeRangeUnique: uniqueIndex("vacations_employee_range_unique").on(t.tenantId, t.employeeId, t.startDate, t.endDate),
  })
);

export type Vacation = typeof vacations.$inferSelect;
export type NewVacation = typeof vacations.$inferInsert;
