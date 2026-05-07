CREATE TABLE IF NOT EXISTS "vacations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "vacations" ADD CONSTRAINT "vacations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "vacations_employee_range_unique" ON "vacations" ("tenant_id", "employee_id", "start_date", "end_date");
CREATE INDEX IF NOT EXISTS "vacations_tenant_employee_idx" ON "vacations" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "vacations_tenant_start_end_idx" ON "vacations" ("tenant_id", "start_date", "end_date");
