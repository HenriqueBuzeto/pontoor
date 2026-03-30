"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { isAdmin } from "@/lib/auth/is-admin";
import { getCurrentUser } from "@/lib/auth/server";
import { reviewAdjustment } from "@/lib/repositories/adjustments";
import { approveAdjustmentWithRecalculation } from "@/lib/services/adjustments";

export type ReviewState = { error?: string };

export async function approveAdjustmentAction(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const ok = await isAdmin();
  if (!ok) return { error: "Sem permissão." };
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };

  const user = await getCurrentUser();
  if (!user?.id) return { error: "Usuário não encontrado." };

  const id = (formData.get("adjustmentId") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim() || undefined;
  const expStartForm = ((formData.get("expStart") as string) || "").trim();
  const expEndForm = ((formData.get("expEnd") as string) || "").trim();
  const lunchStartForm = ((formData.get("lunchStart") as string) || "").trim();
  const lunchEndForm = ((formData.get("lunchEnd") as string) || "").trim();
  const extraStartForm = ((formData.get("extraStart") as string) || "").trim();
  const extraEndForm = ((formData.get("extraEnd") as string) || "").trim();
  if (!id) return { error: "ID inválido." };

  const result = await approveAdjustmentWithRecalculation(tenantId, id, user.id, {
    reviewComment: comment,
    expStart: expStartForm,
    expEnd: expEndForm,
    lunchStart: lunchStartForm,
    lunchEnd: lunchEndForm,
    extraStart: extraStartForm,
    extraEnd: extraEndForm,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/app/admin/justificativas");
  revalidatePath("/app/ajustes");
  revalidatePath("/app/banco-horas");
  revalidatePath("/app");
  revalidatePath("/app/espelho");
  revalidatePath("/app/admin/banco-horas");
  revalidatePath("/app/admin/relatorios");
  return {};
}

export async function rejectAdjustmentAction(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const ok = await isAdmin();
  if (!ok) return { error: "Sem permissão." };
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { error: "Sem tenant." };

  const user = await getCurrentUser();
  if (!user?.id) return { error: "Usuário não encontrado." };

  const id = (formData.get("adjustmentId") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim() || undefined;
  if (!id) return { error: "ID inválido." };

  const updated = await reviewAdjustment(tenantId, id, {
    status: "rejected",
    reviewedById: user.id,
    reviewComment: comment,
  });
  if (!updated) return { error: "Justificativa não encontrada ou já revisada." };
  revalidatePath("/app/admin/justificativas");
  revalidatePath("/app/ajustes");
  return {};
}

