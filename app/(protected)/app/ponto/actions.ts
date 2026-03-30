"use server";

import { timeEntrySchema } from "@/lib/validations/time-entry";
import { createTimeEntry, listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { getCurrentUser } from "@/lib/auth/server";
import { headers } from "next/headers";

function validateNextTimeEntry(
  entries: { type: string; occurredAt: Date }[],
  nextType: string
): string | null {
  const sorted = [...entries].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const count = (t: string) => sorted.filter((e) => e.type === t).length;

  const clockIns = count("clock_in");
  const clockOuts = count("clock_out");
  const breakStarts = count("break_start");
  const breakEnds = count("break_end");

  if (nextType === "break_start" || nextType === "break_end") {
    if (breakStarts > 1 || breakEnds > 1) return "Intervalo inválido para o dia.";
  }

  const hasMainIn = clockIns >= 1;
  const hasMainOut = clockOuts >= 1;
  const hasExtraIn = clockIns >= 2;
  const hasExtraOut = clockOuts >= 2;

  if (nextType === "clock_in") {
    if (!hasMainIn) return null;
    if (hasMainIn && !hasMainOut) return "Você já registrou a entrada hoje.";
    if (hasMainOut && !hasExtraIn) return null;
    if (hasExtraIn && !hasExtraOut) return "Você já registrou a entrada da hora extra.";
    return "Limite de entradas atingido para o dia.";
  }

  if (nextType === "clock_out") {
    if (!hasMainIn) return "Registre a entrada antes da saída.";
    if (hasMainIn && !hasMainOut) {
      if (breakStarts === 1 && breakEnds === 0) return "Finalize o intervalo antes da saída.";
      return null;
    }
    if (hasMainOut && !hasExtraIn) return "Registre a entrada da hora extra antes da saída.";
    if (hasExtraIn && !hasExtraOut) {
      if (breakStarts === 1 && breakEnds === 0) return "Finalize o intervalo antes da saída.";
      return null;
    }
    return "Limite de saídas atingido para o dia.";
  }

  if (nextType === "break_start") {
    if (!hasMainIn) return "Registre a entrada antes do intervalo.";
    if (hasMainOut) return "Intervalo não pode ser registrado após a saída.";
    if (breakStarts >= 1) return "Você já iniciou o intervalo hoje.";
    return null;
  }

  if (nextType === "break_end") {
    if (breakStarts === 0) return "Inicie o intervalo antes de finalizá-lo.";
    if (hasMainOut) return "Intervalo não pode ser finalizado após a saída.";
    if (breakEnds >= 1) return "Você já finalizou o intervalo hoje.";
    return null;
  }

  return null;
}

export type Result = { ok: true; id: string } | { ok: false; error: string };

export async function registerTimeEntry(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  const raw = {
    type: formData.get("type"),
    occurredAt: formData.get("occurredAt")
      ? new Date(formData.get("occurredAt") as string)
      : new Date(),
    observation: formData.get("observation") ?? undefined,
  };

  const parsed = timeEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Dados inválidos." };
  }

  const tenantId = user.tenantId ?? process.env.DEMO_TENANT_ID;
  const employeeId = user.employeeId ?? process.env.DEMO_EMPLOYEE_ID;

  if (!tenantId || !employeeId) {
    return {
      ok: false,
      error: "Usuário sem vínculo com tenant/colaborador. Configure no cadastro de usuários ou use DEMO_TENANT_ID e DEMO_EMPLOYEE_ID para testes.",
    };
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    undefined;
  const userAgent = headersList.get("user-agent") ?? undefined;

  const start = new Date(
    parsed.data.occurredAt.getFullYear(),
    parsed.data.occurredAt.getMonth(),
    parsed.data.occurredAt.getDate(),
    0,
    0,
    0,
    0
  );
  const end = new Date(
    parsed.data.occurredAt.getFullYear(),
    parsed.data.occurredAt.getMonth(),
    parsed.data.occurredAt.getDate(),
    23,
    59,
    59,
    999
  );
  const existing = await listTimeEntriesByEmployee(tenantId, employeeId, start, end);
  const validationError = validateNextTimeEntry(
    existing.map((e) => ({ type: e.type, occurredAt: e.occurredAt })),
    parsed.data.type
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const entry = await createTimeEntry(tenantId, employeeId, {
      type: parsed.data.type,
      occurredAt: parsed.data.occurredAt,
      source: "web",
      ipAddress: ip,
      userAgent,
      observation: parsed.data.observation,
    });
    if (!entry) return { ok: false, error: "Falha ao registrar." };

    const { recalculateDay } = await import("@/lib/services/time-calculation");
    await recalculateDay({
      tenantId,
      employeeId,
      date: parsed.data.occurredAt,
    });

    return { ok: true, id: entry.id };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Erro ao registrar ponto." };
  }
}

export type TodayEntry = { type: string; occurredAt: string };

export async function getTodayEntries(): Promise<TodayEntry[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const tenantId = user.tenantId ?? process.env.DEMO_TENANT_ID;
  const employeeId = user.employeeId ?? process.env.DEMO_EMPLOYEE_ID;

  if (!tenantId || !employeeId) return [];

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const list = await listTimeEntriesByEmployee(tenantId, employeeId, start, end);
  return list.map((e) => ({
    type: e.type,
    occurredAt: e.occurredAt.toISOString(),
  }));
}
