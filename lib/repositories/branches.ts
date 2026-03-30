import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, departments, teams, roles, costCenters } from "@/lib/db/schema";

export async function listBranches(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, tenantId))
    .orderBy(asc(branches.name));
}

export async function listDepartments(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(departments)
    .where(eq(departments.tenantId, tenantId))
    .orderBy(asc(departments.name));
}

export async function listTeams(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(teams)
    .where(eq(teams.tenantId, tenantId))
    .orderBy(asc(teams.name));
}

export async function listRoles(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(roles)
    .where(eq(roles.tenantId, tenantId))
    .orderBy(asc(roles.name));
}

export async function listCostCenters(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(costCenters)
    .where(eq(costCenters.tenantId, tenantId))
    .orderBy(asc(costCenters.name));
}
