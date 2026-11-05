"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { hashPassword } from "@/lib/auth/password";
import { getEmployeeById, updateEmployeeName } from "@/lib/repositories/employees";
import { getUserByEmployeeId, updateUserName, updateUserPassword } from "@/lib/repositories/users";

export type UpdateColaboradorState = { error?: string; success?: boolean; message?: string };

export async function updateColaboradorNameAction(
  employeeId: string,
  _prev: UpdateColaboradorState,
  formData: FormData
): Promise<UpdateColaboradorState> {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  if (!tenantId || !user) return { error: "Sem acesso." };

  const canAdmin = await isAdmin();
  const canEditSelf = !!user.employeeId && user.employeeId === employeeId;
  if (!canAdmin && !canEditSelf) return { error: "Sem permissão." };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { error: "Informe o nome." };

  const employee = await getEmployeeById(tenantId, employeeId);
  if (!employee) return { error: "Colaborador não encontrado." };

  try {
    await updateEmployeeName(tenantId, employeeId, name);
    const linked = await getUserByEmployeeId(tenantId, employeeId);
    if (linked?.id) {
      await updateUserName(linked.id, name);
    }
    return { success: true, message: "Nome atualizado com sucesso." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao atualizar nome." };
  }
}

export async function updateColaboradorPasswordAction(
  employeeId: string,
  _prev: UpdateColaboradorState,
  formData: FormData
): Promise<UpdateColaboradorState> {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  if (!tenantId || !user) return { error: "Sem acesso." };

  const canAdmin = await isAdmin();
  if (!canAdmin) return { error: "Apenas administradores podem redefinir a senha de colaboradores." };

  const newPassword = (formData.get("newPassword") as string | null)?.trim() ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string | null)?.trim() ?? "";

  if (!newPassword) return { error: "Informe a nova senha." };
  if (newPassword.length < 4) return { error: "A senha deve ter no mínimo 4 caracteres." };
  if (newPassword !== confirmPassword) return { error: "A confirmação de senha não confere." };

  const employee = await getEmployeeById(tenantId, employeeId);
  if (!employee) return { error: "Colaborador não encontrado." };

  const linked = await getUserByEmployeeId(tenantId, employeeId);
  if (!linked?.id) {
    return { error: "Usuário de acesso ao sistema não encontrado para este colaborador." };
  }

  try {
    const passwordHash = hashPassword(newPassword);
    await updateUserPassword(linked.id, passwordHash);
    return { success: true, message: "Senha alterada com sucesso!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao alterar senha." };
  }
}
