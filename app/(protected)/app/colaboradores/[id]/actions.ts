"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { getEmployeeById, updateEmployeeName } from "@/lib/repositories/employees";
import { getUserByEmployeeId, updateUserName } from "@/lib/repositories/users";

export type UpdateColaboradorState = { error?: string; success?: boolean };

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
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao atualizar." };
  }
}
