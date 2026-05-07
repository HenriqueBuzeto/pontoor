"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { createVacation, deleteVacation } from "@/lib/repositories/vacations";

export type FeriasState = { error?: string; success?: boolean };

export async function createFeriasAction(_prev: FeriasState, formData: FormData): Promise<FeriasState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };

  const user = await getCurrentUser();
  if (!user?.employeeId) return { error: "Usuário sem colaborador." };

  const startDate = (formData.get("startDate") as string | null)?.trim() ?? "";
  const endDate = (formData.get("endDate") as string | null)?.trim() ?? "";
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: "Data inicial inválida." };
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return { error: "Data final inválida." };

  try {
    await createVacation(tenantId, user.employeeId, startDate, endDate);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao salvar férias." };
  }
}

export async function deleteFeriasAction(id: string): Promise<FeriasState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };

  const user = await getCurrentUser();
  if (!user?.employeeId) return { error: "Usuário sem colaborador." };

  try {
    await deleteVacation(tenantId, id);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao remover férias." };
  }
}
