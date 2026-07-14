"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { createAdjustment } from "@/lib/repositories/adjustments";
import { getEmployeeById } from "@/lib/repositories/employees";
import type { AdjustmentType } from "@/lib/db/schema/adjustments";

export type CreateAdjustmentState = { error?: string; success?: boolean };

export async function createAdjustmentAction(
  _prev: CreateAdjustmentState,
  formData: FormData
): Promise<CreateAdjustmentState> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant. Faça login novamente." };

  const user = await getCurrentUser();
  if (!user?.id || !user.employeeId) {
    return { error: "Usuário sem vínculo de colaborador. Verifique o cadastro." };
  }

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const requestedEmployeeId = (formData.get("employeeId") as string | null)?.trim() ?? "";
  const targetEmployeeId = requestedEmployeeId && isAdmin ? requestedEmployeeId : user.employeeId;
  if (requestedEmployeeId && !isAdmin) {
    return { error: "Você não tem permissão para solicitar ajuste para outro colaborador." };
  }

  const type = (formData.get("type") as string)?.trim();
  const dateStr = (formData.get("date") as string)?.trim();
  const baseReason = (formData.get("reason") as string)?.trim();
  const timeEntryIdRaw = (formData.get("timeEntryId") as string | null) ?? null;

  if (!type || !dateStr || !baseReason) {
    return { error: "Tipo, data e motivo são obrigatórios." };
  }

  if (baseReason.length < 5) {
    return { error: "Descreva o motivo com pelo menos 5 caracteres." };
  }

  const hasTimeFields =
    formData.has("startTime") ||
    formData.has("endTime") ||
    formData.has("lunchStart") ||
    formData.has("lunchEnd") ||
    formData.has("extraStart") ||
    formData.has("extraEnd");

  const normalizeTime = (value: string) => {
    const v = value.trim();
    return v;
  };

  const startTime = normalizeTime((formData.get("startTime") as string) || "");
  const endTime = normalizeTime((formData.get("endTime") as string) || "");
  const lunchStart = normalizeTime((formData.get("lunchStart") as string) || "");
  const lunchEnd = normalizeTime((formData.get("lunchEnd") as string) || "");
  const extraStart = normalizeTime((formData.get("extraStart") as string) || "");
  const extraEnd = normalizeTime((formData.get("extraEnd") as string) || "");

  let reason = baseReason;
  const detalhes: string[] = [];
  // Se o formulário enviou os campos de horário (ex.: Banco de Horas), sempre anexamos o resumo,
  // mesmo que o usuário só tenha alterado um campo.
  if (hasTimeFields) {
    detalhes.push("Horários informados para correção:");
    if (startTime || endTime) {
      detalhes.push(`- Expediente: ${startTime || "—"} até ${endTime || "—"}`);
    }
    if (lunchStart || lunchEnd) {
      detalhes.push(`- Almoço: ${lunchStart || "—"} até ${lunchEnd || "—"}`);
    }
    if (extraStart || extraEnd) {
      detalhes.push(`- Hora extra: ${extraStart || "—"} até ${extraEnd || "—"}`);
    }
    if (!startTime && !endTime) detalhes.push("- Expediente: — até —");
    if (!lunchStart && !lunchEnd) detalhes.push("- Almoço: — até —");
    if (!extraStart && !extraEnd) detalhes.push("- Hora extra: — até —");
    reason = `${baseReason}\n\n${detalhes.join("\n")}`;
  }

  let date: Date;
  try {
    // data vem como YYYY-MM-DD
    date = new Date(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new Error("Data inválida");
  } catch {
    return { error: "Data inválida." };
  }

  try {
    if (targetEmployeeId !== user.employeeId) {
      const emp = await getEmployeeById(tenantId, targetEmployeeId);
      if (!emp?.id) {
        return { error: "Colaborador inválido para este tenant." };
      }
    }

    const created = await createAdjustment(tenantId, {
      employeeId: targetEmployeeId,
      type: type as AdjustmentType,
      reason,
      date,
      requestedById: user.id,
      timeEntryId: timeEntryIdRaw && timeEntryIdRaw.length > 0 ? timeEntryIdRaw : null,
      status: "pending",
      reviewComment: null,
      reviewedById: null,
      reviewedAt: null,
    });

    if (!created) {
      return { error: "Não foi possível registrar o ajuste. Tente novamente." };
    }

    revalidatePath("/app/ajustes");
    revalidatePath("/app/admin/justificativas");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao salvar ajuste. Tente novamente." };
  }
}

