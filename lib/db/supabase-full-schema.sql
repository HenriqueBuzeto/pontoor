-- =============================================================================
-- PONTO OR — Script completo para Supabase/PostgreSQL
-- Tabelas, índices, FKs, funções, triggers e RLS
-- Executar no SQL Editor do Supabase (ou psql) na ordem apresentada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNÇÃO: atualizar updated_at automaticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. TABELAS (ordem respeitando FKs)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  document varchar(20),
  logo_url text,
  plan varchar(50) DEFAULT 'starter',
  settings jsonb DEFAULT '{}',
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  auth_id varchar(255) NOT NULL UNIQUE,
  email varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  avatar_url text,
  role varchar(50) NOT NULL,
  permissions jsonb DEFAULT '[]',
  employee_id uuid,
  active boolean DEFAULT true NOT NULL,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  email varchar(255) NOT NULL,
  role varchar(50) NOT NULL,
  token varchar(255) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name varchar(255) NOT NULL,
  code varchar(50),
  address text,
  city varchar(100),
  state varchar(2),
  zip_code varchar(20),
  timezone varchar(50) DEFAULT 'America/Sao_Paulo',
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  code varchar(50),
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  description text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  code varchar(50),
  type varchar(50) NOT NULL,
  entry_time time,
  exit_time time,
  break_start time,
  break_end time,
  break_minutes integer DEFAULT 60,
  tolerance_late_minutes integer DEFAULT 0,
  tolerance_early_leave_minutes integer DEFAULT 0,
  tolerance_mark_minutes integer DEFAULT 0,
  daily_hours integer DEFAULT 8,
  weekly_hours integer DEFAULT 44,
  overtime_rule varchar(50) DEFAULT 'bank',
  night_shift_start time,
  night_shift_end time,
  work_days jsonb DEFAULT '[1,2,3,4,5]',
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  code varchar(50),
  manager_id uuid,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  type varchar(50) NOT NULL,
  date timestamptz NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  registration varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  email varchar(255),
  cpf varchar(14) NOT NULL,
  birth_date date,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES public.employees(id),
  work_schedule_id uuid REFERENCES public.work_schedules(id) ON DELETE SET NULL,
  admission_date date NOT NULL,
  resignation_date date,
  contract_type varchar(50) DEFAULT 'clt',
  photo_url text,
  tolerance_minutes_late varchar(10) DEFAULT '0',
  tolerance_minutes_early_leave varchar(10) DEFAULT '0',
  status varchar(20) DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.employee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  changed_by uuid REFERENCES public.employees(id),
  field varchar(100) NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  work_schedule_id uuid REFERENCES public.work_schedules(id) ON DELETE CASCADE NOT NULL,
  name varchar(255) NOT NULL,
  pattern varchar(50) NOT NULL,
  cycle_days integer,
  work_days_in_cycle integer,
  rest_days_in_cycle integer,
  definition jsonb,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scale_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid NOT NULL,
  scale_id uuid REFERENCES public.scales(id) ON DELETE CASCADE NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  type varchar(30) NOT NULL,
  occurred_at timestamptz NOT NULL,
  source varchar(50) DEFAULT 'web',
  ip_address varchar(45),
  user_agent text,
  location jsonb,
  photo_url text,
  observation text,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  synced boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  type varchar(50) NOT NULL,
  reason text NOT NULL,
  date timestamptz NOT NULL,
  time_entry_id uuid REFERENCES public.time_entries(id),
  requested_by_id uuid REFERENCES public.users(id),
  status varchar(20) DEFAULT 'pending' NOT NULL,
  reviewed_by_id uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.adjustment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  adjustment_id uuid REFERENCES public.adjustments(id) ON DELETE CASCADE NOT NULL,
  file_name varchar(255) NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(100),
  size_bytes integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hour_bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  type varchar(20) NOT NULL,
  amount_minutes integer NOT NULL,
  balance_after_minutes integer,
  reference_type varchar(50),
  reference_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  approved_by_id uuid REFERENCES public.users(id),
  approved_at timestamptz,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hour_bank_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_minutes integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.time_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  worked_minutes integer DEFAULT 0,
  expected_minutes integer DEFAULT 0,
  balance_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  late_minutes integer DEFAULT 0,
  early_leave_minutes integer DEFAULT 0,
  absent boolean DEFAULT false,
  night_shift_minutes integer DEFAULT 0,
  break_deficit_minutes integer DEFAULT 0,
  details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.period_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  closed_at timestamptz,
  closed_by_id uuid REFERENCES public.users(id),
  version integer DEFAULT 1 NOT NULL,
  reopened_at timestamptz,
  reopened_by_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.closure_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  period_closure_id uuid REFERENCES public.period_closures(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  snapshot jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),
  auth_id varchar(255),
  action varchar(100) NOT NULL,
  entity varchar(100) NOT NULL,
  entity_id uuid,
  "before" jsonb,
  "after" jsonb,
  ip_address varchar(45),
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type varchar(100) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_enabled boolean DEFAULT true NOT NULL,
  in_app_enabled boolean DEFAULT true NOT NULL,
  types jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. FKs adicionais (referências circulares)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'users'
    AND constraint_name = 'users_employee_id_fkey'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'teams'
    AND constraint_name = 'teams_manager_id_fkey'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT teams_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'scale_assignments'
    AND constraint_name = 'scale_assignments_employee_id_fkey'
  ) THEN
    ALTER TABLE public.scale_assignments ADD CONSTRAINT scale_assignments_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. ÍNDICES
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_tenant_registration ON public.employees(tenant_id, registration) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON public.departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON public.teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON public.time_entries(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_occurred_at ON public.time_entries(occurred_at);
CREATE INDEX IF NOT EXISTS idx_adjustments_tenant_status ON public.adjustments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_time_calculations_employee_date ON public.time_calculations(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_period_closures_tenant_period ON public.period_closures(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);

-- -----------------------------------------------------------------------------
-- 5. TRIGGERS updated_at (DROP IF EXISTS para permitir re-executar o script)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tenants_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
DROP TRIGGER IF EXISTS branches_updated_at ON public.branches;
DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
DROP TRIGGER IF EXISTS cost_centers_updated_at ON public.cost_centers;
DROP TRIGGER IF EXISTS roles_updated_at ON public.roles;
DROP TRIGGER IF EXISTS work_schedules_updated_at ON public.work_schedules;
DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
DROP TRIGGER IF EXISTS scales_updated_at ON public.scales;
DROP TRIGGER IF EXISTS scale_assignments_updated_at ON public.scale_assignments;
DROP TRIGGER IF EXISTS time_entries_updated_at ON public.time_entries;
DROP TRIGGER IF EXISTS adjustments_updated_at ON public.adjustments;
DROP TRIGGER IF EXISTS hour_bank_balances_updated_at ON public.hour_bank_balances;
DROP TRIGGER IF EXISTS period_closures_updated_at ON public.period_closures;
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER scales_updated_at
  BEFORE UPDATE ON public.scales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER scale_assignments_updated_at
  BEFORE UPDATE ON public.scale_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER adjustments_updated_at
  BEFORE UPDATE ON public.adjustments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER hour_bank_balances_updated_at
  BEFORE UPDATE ON public.hour_bank_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER period_closures_updated_at
  BEFORE UPDATE ON public.period_closures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. FUNÇÕES RLS (Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid()::text AND role = 'super_admin');
$$;

-- -----------------------------------------------------------------------------
-- 7. PROCEDURE: registrar auditoria (opcional, chamada pela aplicação)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_insert(
  p_tenant_id uuid,
  p_user_id uuid,
  p_auth_id varchar(255),
  p_action varchar(100),
  p_entity varchar(100),
  p_entity_id uuid,
  p_before_data jsonb,
  p_after_data jsonb,
  p_ip_address varchar(45) DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id, user_id, auth_id, action, entity, entity_id,
    "before", "after", ip_address, user_agent, metadata
  ) VALUES (
    p_tenant_id, p_user_id, p_auth_id, p_action, p_entity, p_entity_id,
    p_before_data, p_after_data, p_ip_address, p_user_agent, p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. RLS: habilitar em todas as tabelas
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 9. POLÍTICAS RLS (DROP se existir para poder re-executar o script)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
  DROP POLICY IF EXISTS "users_select" ON public.users;
  DROP POLICY IF EXISTS "users_insert" ON public.users;
  DROP POLICY IF EXISTS "users_update" ON public.users;
  DROP POLICY IF EXISTS "invitations_tenant" ON public.invitations;
  DROP POLICY IF EXISTS "branches_tenant" ON public.branches;
  DROP POLICY IF EXISTS "departments_tenant" ON public.departments;
  DROP POLICY IF EXISTS "cost_centers_tenant" ON public.cost_centers;
  DROP POLICY IF EXISTS "teams_tenant" ON public.teams;
  DROP POLICY IF EXISTS "roles_tenant" ON public.roles;
  DROP POLICY IF EXISTS "calendar_events_tenant" ON public.calendar_events;
  DROP POLICY IF EXISTS "work_schedules_tenant" ON public.work_schedules;
  DROP POLICY IF EXISTS "employees_tenant" ON public.employees;
  DROP POLICY IF EXISTS "employee_history_tenant" ON public.employee_history;
  DROP POLICY IF EXISTS "scales_tenant" ON public.scales;
  DROP POLICY IF EXISTS "scale_assignments_tenant" ON public.scale_assignments;
  DROP POLICY IF EXISTS "time_entries_tenant" ON public.time_entries;
  DROP POLICY IF EXISTS "adjustments_tenant" ON public.adjustments;
  DROP POLICY IF EXISTS "adjustment_attachments_tenant" ON public.adjustment_attachments;
  DROP POLICY IF EXISTS "hour_bank_transactions_tenant" ON public.hour_bank_transactions;
  DROP POLICY IF EXISTS "hour_bank_balances_tenant" ON public.hour_bank_balances;
  DROP POLICY IF EXISTS "time_calculations_tenant" ON public.time_calculations;
  DROP POLICY IF EXISTS "period_closures_tenant" ON public.period_closures;
  DROP POLICY IF EXISTS "closure_versions_tenant" ON public.closure_versions;
  DROP POLICY IF EXISTS "audit_logs_tenant" ON public.audit_logs;
  DROP POLICY IF EXISTS "notifications_tenant" ON public.notifications;
  DROP POLICY IF EXISTS "notification_preferences_tenant" ON public.notification_preferences;
END $$;

CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
  USING (public.is_super_admin() OR id = public.current_tenant_id());

CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (public.is_super_admin() OR tenant_id = public.current_tenant_id());
CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY "invitations_tenant" ON public.invitations FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "branches_tenant" ON public.branches FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "departments_tenant" ON public.departments FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "cost_centers_tenant" ON public.cost_centers FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "teams_tenant" ON public.teams FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "roles_tenant" ON public.roles FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "calendar_events_tenant" ON public.calendar_events FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "work_schedules_tenant" ON public.work_schedules FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "employees_tenant" ON public.employees FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "employee_history_tenant" ON public.employee_history FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "scales_tenant" ON public.scales FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "scale_assignments_tenant" ON public.scale_assignments FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "time_entries_tenant" ON public.time_entries FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "adjustments_tenant" ON public.adjustments FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "adjustment_attachments_tenant" ON public.adjustment_attachments FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "hour_bank_transactions_tenant" ON public.hour_bank_transactions FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "hour_bank_balances_tenant" ON public.hour_bank_balances FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "time_calculations_tenant" ON public.time_calculations FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "period_closures_tenant" ON public.period_closures FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "closure_versions_tenant" ON public.closure_versions FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "audit_logs_tenant" ON public.audit_logs FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR (tenant_id IS NULL AND public.is_super_admin()) OR public.is_super_admin());

CREATE POLICY "notifications_tenant" ON public.notifications FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "notification_preferences_tenant" ON public.notification_preferences FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- -----------------------------------------------------------------------------
-- FIM
-- -----------------------------------------------------------------------------
