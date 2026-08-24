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
    const { recalculateDay } = await import("@/lib/services/time-calculation");
    await createVacation(tenantId, user.employeeId, startDate, endDate);
    
    // Recalculate days in the range (parse parts to avoid timezone shift)
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);
    const end = new Date(eYear, eMonth - 1, eDay);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      await recalculateDay({
        tenantId,
        employeeId: user.employeeId,
        date: new Date(d)
      });
    }

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
    const { listVacationsByEmployee } = await import("@/lib/repositories/vacations");
    const vacations = await listVacationsByEmployee(tenantId, user.employeeId);
    const vacationToDelete = vacations.find(v => v.id === id);

    await deleteVacation(tenantId, id);

    if (vacationToDelete) {
      const { recalculateDay } = await import("@/lib/services/time-calculation");
      const [sYear, sMonth, sDay] = vacationToDelete.startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = vacationToDelete.endDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay);
      const end = new Date(eYear, eMonth - 1, eDay);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        await recalculateDay({
          tenantId,
          employeeId: user.employeeId,
          date: new Date(d)
        });
      }
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Erro ao remover férias." };
  }
}
