"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { createEmployee, getNextEmployeeRegistration } from "@/lib/repositories/employees";
import { createUser } from "@/lib/repositories/users";
import { listUsernamesByTenant } from "@/lib/repositories/users";
import { contractTypes } from "@/lib/db/schema/employees";
import { usernameFromFullName, ensureUniqueUsername } from "@/lib/auth/username-from-name";
import { usernameToInternalEmail } from "@/lib/auth/constants";
import { isAdmin } from "@/lib/auth/is-admin";
import { hashPassword } from "@/lib/auth/password";
import { randomUUID } from "crypto";

export type CreateColaboradorState = {
  error?: string;
  /** Quando preenchido, colaborador foi criado e login também; exibir credenciais. */
  login?: string;
};

const MIN_PASSWORD_LENGTH = 6;

export async function createColaboradorAction(
  _prev: CreateColaboradorState,
  formData: FormData
): Promise<CreateColaboradorState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem acesso ao tenant." };

  let registration = (formData.get("registration") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim().replace(/\D/g, "");
  const email = (formData.get("email") as string)?.trim() || null;
  const admissionDate = (formData.get("admissionDate") as string)?.trim();
  const branchId = (formData.get("branchId") as string)?.trim() || null;
  const departmentId = (formData.get("departmentId") as string)?.trim() || null;
  const teamId = (formData.get("teamId") as string)?.trim() || null;
  const roleId = (formData.get("roleId") as string)?.trim() || null;
  const workScheduleId = (formData.get("workScheduleId") as string)?.trim() || null;
  const contractType = (formData.get("contractType") as string)?.trim();
  const status = (formData.get("status") as string)?.trim() || "active";
  const password = (formData.get("password") as string)?.trim();
  const requestedRole = (formData.get("role") as string)?.trim() || "employee";

  if (!name || !cpf || !admissionDate)
    return { error: "Preencha nome, CPF e data de admissão." };
  if (cpf.length !== 11) return { error: "CPF deve ter 11 dígitos." };
  const validContract = contractTypes.includes(contractType as (typeof contractTypes)[number]);
  if (!validContract) return { error: "Tipo de contrato inválido." };

  if (!password || password.length < MIN_PASSWORD_LENGTH)
    return { error: `Informe a senha de acesso inicial (mínimo ${MIN_PASSWORD_LENGTH} caracteres).` };

  // Define o papel do novo usuário (employee por padrão; admin apenas se quem está criando for admin)
  let newUserRole: "employee" | "admin" = "employee";
  if (requestedRole === "admin") {
    const canCreateAdmin = await isAdmin();
    if (!canCreateAdmin) {
      return { error: "Somente administradores podem criar usuários com acesso de administrador." };
    }
    newUserRole = "admin";
  }

  // Gera matrícula sequencial caso não tenha sido informada
  if (!registration) {
    registration = await getNextEmployeeRegistration(tenantId);
  }

  let employeeId: string;
  try {
    const created = await createEmployee(tenantId, {
      tenantId,
      registration,
      name,
      email,
      cpf,
      // campo date no Postgres aceita string "YYYY-MM-DD"
      admissionDate,
      branchId: branchId || undefined,
      departmentId: departmentId || undefined,
      teamId: teamId || undefined,
      roleId: roleId || undefined,
      workScheduleId: workScheduleId || undefined,
      contractType: contractType as (typeof contractTypes)[number],
      status: status as "active" | "inactive" | "on_leave",
    });
    employeeId = created!.id;
  } catch (e) {
    console.error("Erro ao salvar colaborador:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Erro ao salvar colaborador: ${msg}` };
  }

  const existingUsernames = await listUsernamesByTenant(tenantId);
  const baseUsername = usernameFromFullName(name);
  const username = ensureUniqueUsername(baseUsername, existingUsernames, registration);

  const internalEmail = usernameToInternalEmail(username);

  try {
    await createUser({
      tenantId,
      authId: `local-${randomUUID()}`,
      email: internalEmail,
      passwordHash: hashPassword(password),
      name,
      role: newUserRole,
      employeeId,
    });
  } catch (e) {
    console.error(e);
    return {
      error: "Colaborador cadastrado, mas falha ao criar o usuário de acesso no banco. Verifique a tabela users.",
    };
  }

  return { login: username };
}

