import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { employees } from "./employees";

export const entryTypes = [
  "clock_in",   // entrada
  "clock_out",  // saída
  "break_start",
  "break_end",
  "pause_start",
  "pause_end",
] as const;
export type EntryType = (typeof entryTypes)[number];

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 30 }).notNull().$type<EntryType>(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 50 }).default("web"), // web, app, biometric, manual
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  location: jsonb("location").$type<{ lat?: number; lng?: number; accuracy?: number }>(),
  photoUrl: text("photo_url"),
  observation: text("observation"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  synced: boolean("synced").default(true).notNull(), // para PWA offline
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
