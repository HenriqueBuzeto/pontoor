-- Ponto OR — Políticas RLS (Row Level Security) para Supabase
-- Executar após as migrations. Assume que existe uma função auth.uid() e que
-- há uma tabela ou view que retorna tenant_id do usuário logado (ex: public.current_user_tenant()).

-- Habilitar RLS em todas as tabelas multi-tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE closure_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o tenant_id do usuário atual (via tabela users ligada ao auth.uid())
-- Criar em Supabase: função que faz join users com auth.uid() e retorna users.tenant_id
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE auth_id = auth.uid()::text LIMIT 1;
$$;

-- Super admin: pode ver todos os tenants (tenant_id NULL na users)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid()::text AND role = 'super_admin');
$$;

-- Políticas por tabela: usuário só acessa linhas do seu tenant (ou super_admin acessa tudo)

-- Tenants: super_admin vê todos; demais veem apenas o próprio tenant
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (is_super_admin() OR id = current_tenant_id());

-- Users: mesmo critério
CREATE POLICY "users_select" ON users FOR SELECT
  USING (is_super_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (is_super_admin() OR tenant_id = current_tenant_id());
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (is_super_admin() OR tenant_id = current_tenant_id());

-- Demais tabelas: sempre filtrar por tenant_id
CREATE POLICY "branches_tenant" ON branches FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "departments_tenant" ON departments FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "cost_centers_tenant" ON cost_centers FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "teams_tenant" ON teams FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "roles_tenant" ON roles FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "calendar_events_tenant" ON calendar_events FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "employees_tenant" ON employees FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "employee_history_tenant" ON employee_history FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "work_schedules_tenant" ON work_schedules FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "scales_tenant" ON scales FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "scale_assignments_tenant" ON scale_assignments FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "time_entries_tenant" ON time_entries FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "adjustments_tenant" ON adjustments FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "adjustment_attachments_tenant" ON adjustment_attachments FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "hour_bank_transactions_tenant" ON hour_bank_transactions FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "hour_bank_balances_tenant" ON hour_bank_balances FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "time_calculations_tenant" ON time_calculations FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "period_closures_tenant" ON period_closures FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "closure_versions_tenant" ON closure_versions FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

-- audit_logs: tenant_id pode ser null para ações de super_admin
CREATE POLICY "audit_logs_tenant" ON audit_logs FOR SELECT
  USING (tenant_id = current_tenant_id() OR tenant_id IS NULL AND is_super_admin() OR is_super_admin());

CREATE POLICY "notifications_tenant" ON notifications FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "notification_preferences_tenant" ON notification_preferences FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

CREATE POLICY "invitations_tenant" ON invitations FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
