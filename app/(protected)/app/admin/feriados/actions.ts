"use server";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { isAdmin } from "@/lib/auth/is-admin";
import { createHoliday, deleteHoliday } from "@/lib/repositories/holidays";

export type HolidayAdminState = { error?: string; success?: boolean };

export async function createHolidayAction(
  _prev: HolidayAdminState,
  formData: FormData
): Promise<HolidayAdminState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };
  const ok = await isAdmin();
  if (!ok) return { error: "Sem permissão." };

  const date = (formData.get("date") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida." };
  if (!name) return { error: "Informe o nome." };

  try {
    await createHoliday(tenantId, date, name);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao salvar." };
  }
}

export async function deleteHolidayAction(dateKey: string): Promise<HolidayAdminState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };
  const ok = await isAdmin();
  if (!ok) return { error: "Sem permissão." };

  try {
    await deleteHoliday(tenantId, dateKey);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao remover." };
  }
}
