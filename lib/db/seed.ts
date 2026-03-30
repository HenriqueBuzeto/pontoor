/**
 * Ponto OR — Seed de demonstração
 * Execute com: npm run db:seed (ou tsx lib/db/seed.ts)
 * Requer DATABASE_URL e que as migrations já tenham sido aplicadas.
 */

import { getDb } from "./index";
import {
  tenants,
  users,
  branches,
  departments,
  teams,
  roles,
  costCenters,
  workSchedules,
  employees,
  calendarEvents,
} from "./schema";
import { randomUUID } from "crypto";
import { hashPassword } from "../auth/password";
import { eq } from "drizzle-orm";

const TENANT_ID = randomUUID();
const BRANCH_ID = randomUUID();
const DEPT_ID = randomUUID();
const TEAM_ID = randomUUID();
const ROLE_ID = randomUUID();
const COST_CENTER_ID = randomUUID();
const SCHEDULE_ID = randomUUID();
const ADMIN_USER_ID = randomUUID();
const MANAGER_EMP_ID = randomUUID();
const EMP1_ID = randomUUID();
const EMP2_ID = randomUUID();

async function seed() {
  const db = getDb();

  const [existingTenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, "empresa-demo"))
    .limit(1);

  if (existingTenant?.id) {
    const [existingAdmin] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, "admin@ponto-or.demo"))
      .limit(1);

    if (!existingAdmin?.id) {
      await db.insert(users).values({
        id: randomUUID(),
        tenantId: existingTenant.id,
        authId: "demo-auth-admin-" + existingTenant.id.slice(0, 8),
        email: "admin@ponto-or.demo",
        passwordHash: hashPassword("admin"),
        name: "Admin Demo",
        role: "admin",
        active: true,
      });
    } else if (!existingAdmin.passwordHash) {
      await db
        .update(users)
        .set({ passwordHash: hashPassword("admin") })
        .where(eq(users.id, existingAdmin.id));
    }

    console.log("Seed já aplicado: tenant empresa-demo já existe. Admin garantido.");
    return;
  }

  await db.insert(tenants).values({
    id: TENANT_ID,
    name: "Empresa Demo Ponto OR",
    slug: "empresa-demo",
    document: "12.345.678/0001-90",
    plan: "professional",
    active: true,
  });

  await db.insert(users).values({
    id: ADMIN_USER_ID,
    tenantId: TENANT_ID,
    authId: "demo-auth-admin-" + TENANT_ID.slice(0, 8),
    email: "admin@ponto-or.demo",
    passwordHash: hashPassword("admin"),
    name: "Admin Demo",
    role: "admin",
    active: true,
  });

  await db.insert(branches).values({
    id: BRANCH_ID,
    tenantId: TENANT_ID,
    name: "Matriz",
    code: "MAT",
    city: "São Paulo",
    state: "SP",
    timezone: "America/Sao_Paulo",
    active: true,
  });

  await db.insert(departments).values({
    id: DEPT_ID,
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    name: "Tecnologia",
    code: "TI",
    active: true,
  });

  await db.insert(costCenters).values({
    id: COST_CENTER_ID,
    tenantId: TENANT_ID,
    name: "Centro de Custo TI",
    code: "CC-TI",
    active: true,
  });

  await db.insert(roles).values({
    id: ROLE_ID,
    tenantId: TENANT_ID,
    name: "Desenvolvedor",
    code: "DEV",
    active: true,
  });

  await db.insert(workSchedules).values({
    id: SCHEDULE_ID,
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    name: "Comercial 8h",
    code: "COM-8",
    type: "fixed",
    toleranceLateMinutes: 10,
    breakMinutes: 60,
    dailyHours: 480,
    weeklyHours: 2640, // 44h
    workDays: [1, 2, 3, 4, 5],
    active: true,
  });

  await db.insert(employees).values({
    id: MANAGER_EMP_ID,
    tenantId: TENANT_ID,
    registration: "001",
    name: "Maria Gestora",
    email: "maria@demo.ponto-or",
    cpf: "12345678909",
    branchId: BRANCH_ID,
    departmentId: DEPT_ID,
    roleId: ROLE_ID,
    costCenterId: COST_CENTER_ID,
    workScheduleId: SCHEDULE_ID,
    admissionDate: "2023-01-15",
    contractType: "clt",
    status: "active",
  });

  await db.insert(teams).values({
    id: TEAM_ID,
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    departmentId: DEPT_ID,
    name: "Squad Frontend",
    code: "SQ-FE",
    managerId: MANAGER_EMP_ID,
    active: true,
  });

  await db.insert(employees).values([
    {
      id: EMP1_ID,
      tenantId: TENANT_ID,
      registration: "002",
      name: "João Colaborador",
      email: "joao@demo.ponto-or",
      cpf: "98765432100",
      branchId: BRANCH_ID,
      departmentId: DEPT_ID,
      teamId: TEAM_ID,
      roleId: ROLE_ID,
      costCenterId: COST_CENTER_ID,
      managerId: MANAGER_EMP_ID,
      workScheduleId: SCHEDULE_ID,
      admissionDate: "2023-06-01",
      contractType: "clt",
      status: "active",
    },
    {
      id: EMP2_ID,
      tenantId: TENANT_ID,
      registration: "003",
      name: "Ana Colaboradora",
      email: "ana@demo.ponto-or",
      cpf: "11122233344",
      branchId: BRANCH_ID,
      departmentId: DEPT_ID,
      teamId: TEAM_ID,
      roleId: ROLE_ID,
      costCenterId: COST_CENTER_ID,
      managerId: MANAGER_EMP_ID,
      workScheduleId: SCHEDULE_ID,
      admissionDate: "2024-01-10",
      contractType: "clt",
      status: "active",
    },
  ]);

  await db.insert(calendarEvents).values([
    {
      tenantId: TENANT_ID,
      title: "Ano Novo",
      type: "national_holiday",
      date: new Date("2025-01-01"),
    },
    {
      tenantId: TENANT_ID,
      title: "Carnaval",
      type: "national_holiday",
      date: new Date("2025-02-25"),
    },
    {
      tenantId: TENANT_ID,
      title: "Dia do Trabalho",
      type: "national_holiday",
      date: new Date("2025-05-01"),
    },
  ]);

  console.log("Seed concluído: tenant empresa-demo, filial Matriz, 3 colaboradores, jornada Comercial 8h, feriados.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
