"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { updateEmployeeName } from "@/lib/repositories/employees";
import { updateUserName } from "@/lib/repositories/users";

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileNameAction(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const user = await getCurrentUser();
  if (!user?.id) return { error: "Sem acesso." };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { error: "Informe o nome." };

  try {
    await updateUserName(user.id, name);

    const tenantId = await getCurrentTenantId();
    if (tenantId && user.employeeId) {
      await updateEmployeeName(tenantId, user.employeeId, name);
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao atualizar." };
  }
}
