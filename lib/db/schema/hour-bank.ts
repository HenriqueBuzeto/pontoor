import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { employees } from "./employees";
import { users } from "./users";

export const transactionTypes = ["credit", "debit", "adjustment", "expiry"] as const;
export type HourBankTransactionType = (typeof transactionTypes)[number];

export const hourBankTransactions = pgTable("hour_bank_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull().$type<HourBankTransactionType>(),
  amountMinutes: integer("amount_minutes").notNull(), // positivo = crédito, negativo = débito
  balanceAfterMinutes: integer("balance_after_minutes"),
  referenceType: varchar("reference_type", { length: 50 }), // time_calculation, adjustment, manual
  referenceId: uuid("reference_id"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  approvedById: uuid("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const hourBankBalances = pgTable("hour_bank_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull().unique(),
  balanceMinutes: integer("balance_minutes").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type HourBankTransaction = typeof hourBankTransactions.$inferSelect;
export type HourBankBalance = typeof hourBankBalances.$inferSelect;
