import { pgTable, uuid, varchar, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantDateUnique: uniqueIndex("holidays_tenant_date_unique").on(t.tenantId, t.date),
  })
);

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
