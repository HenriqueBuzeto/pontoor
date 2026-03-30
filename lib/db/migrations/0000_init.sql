-- Ponto OR — Migration inicial (gerada a partir do schema Drizzle)
-- Aplicar com: npm run db:migrate (ou executar no Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "document" varchar(20),
  "logo_url" text,
  "plan" varchar(50) DEFAULT 'starter',
  "settings" jsonb DEFAULT '{}',
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE,
  "auth_id" varchar(255) NOT NULL UNIQUE,
  "email" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "avatar_url" text,
  "role" varchar(50) NOT NULL,
  "permissions" jsonb DEFAULT '[]',
  "employee_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" varchar(50) NOT NULL,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "branches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "address" text,
  "city" varchar(100),
  "state" varchar(2),
  "zip_code" varchar(20),
  "timezone" varchar(50) DEFAULT 'America/Sao_Paulo',
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cost_centers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50) NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "work_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "type" varchar(50) NOT NULL,
  "entry_time" time,
  "exit_time" time,
  "break_start" time,
  "break_end" time,
  "break_minutes" integer DEFAULT 60,
  "tolerance_late_minutes" integer DEFAULT 0,
  "tolerance_early_leave_minutes" integer DEFAULT 0,
  "tolerance_mark_minutes" integer DEFAULT 0,
  "daily_hours" integer DEFAULT 8,
  "weekly_hours" integer DEFAULT 44,
  "overtime_rule" varchar(50) DEFAULT 'bank',
  "night_shift_start" time,
  "night_shift_end" time,
  "work_days" jsonb DEFAULT '[1,2,3,4,5]',
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
  "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "manager_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "registration" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255),
  "cpf" varchar(14) NOT NULL,
  "birth_date" date,
  "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
  "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL,
  "team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL,
  "role_id" uuid REFERENCES "roles"("id") ON DELETE SET NULL,
  "cost_center_id" uuid REFERENCES "cost_centers"("id") ON DELETE SET NULL,
  "manager_id" uuid REFERENCES "employees"("id"),
  "work_schedule_id" uuid REFERENCES "work_schedules"("id") ON DELETE SET NULL,
  "admission_date" date NOT NULL,
  "resignation_date" date,
  "contract_type" varchar(50) DEFAULT 'clt',
  "photo_url" text,
  "tolerance_minutes_late" varchar(10) DEFAULT '0',
  "tolerance_minutes_early_leave" varchar(10) DEFAULT '0',
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "employee_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL,
  "changed_by" uuid REFERENCES "employees"("id"),
  "field" varchar(100) NOT NULL,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "work_schedule_id" uuid REFERENCES "work_schedules"("id") ON DELETE CASCADE NOT NULL,
  "name" varchar(255) NOT NULL,
  "pattern" varchar(50) NOT NULL,
  "cycle_days" integer,
  "work_days_in_cycle" integer,
  "rest_days_in_cycle" integer,
  "definition" jsonb,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scale_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid NOT NULL,
  "scale_id" uuid REFERENCES "scales"("id") ON DELETE CASCADE NOT NULL,
  "effective_from" timestamp with time zone NOT NULL,
  "effective_to" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL,
  "type" varchar(30) NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "source" varchar(50) DEFAULT 'web',
  "ip_address" varchar(45),
  "user_agent" text,
  "location" jsonb,
  "photo_url" text,
  "observation" text,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "synced" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL,
  "type" varchar(50) NOT NULL,
  "reason" text NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "time_entry_id" uuid,
  "requested_by_id" uuid REFERENCES "users"("id"),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "reviewed_by_id" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "review_comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "adjustment_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "adjustment_id" uuid REFERENCES "adjustments"("id") ON DELETE CASCADE NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "storage_path" text NOT NULL,
  "mime_type" varchar(100),
  "size_bytes" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hour_bank_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL,
  "type" varchar(20) NOT NULL,
  "amount_minutes" integer NOT NULL,
  "balance_after_minutes" integer,
  "reference_type" varchar(50),
  "reference_id" uuid,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "approved_by_id" uuid REFERENCES "users"("id"),
  "approved_at" timestamp with time zone,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hour_bank_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL UNIQUE,
  "balance_minutes" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "time_calculations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "employee_id" uuid REFERENCES "employees"("id") ON DELETE CASCADE NOT NULL,
  "date" date NOT NULL,
  "worked_minutes" integer DEFAULT 0,
  "expected_minutes" integer DEFAULT 0,
  "balance_minutes" integer DEFAULT 0,
  "overtime_minutes" integer DEFAULT 0,
  "late_minutes" integer DEFAULT 0,
  "early_leave_minutes" integer DEFAULT 0,
  "absent" boolean DEFAULT false,
  "night_shift_minutes" integer DEFAULT 0,
  "break_deficit_minutes" integer DEFAULT 0,
  "details" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "period_closures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "branch_id" uuid,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "closed_at" timestamp with time zone,
  "closed_by_id" uuid REFERENCES "users"("id"),
  "version" integer DEFAULT 1 NOT NULL,
  "reopened_at" timestamp with time zone,
  "reopened_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "closure_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "period_closure_id" uuid REFERENCES "period_closures"("id") ON DELETE CASCADE NOT NULL,
  "version" integer NOT NULL,
  "snapshot" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid,
  "auth_id" varchar(255),
  "action" varchar(100) NOT NULL,
  "entity" varchar(100) NOT NULL,
  "entity_id" uuid,
  "before" jsonb,
  "after" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE NOT NULL,
  "type" varchar(100) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "link" text,
  "read_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE NOT NULL,
  "email_enabled" boolean DEFAULT true NOT NULL,
  "in_app_enabled" boolean DEFAULT true NOT NULL,
  "types" jsonb DEFAULT '[]',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_registration ON employees(tenant_id, registration);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
