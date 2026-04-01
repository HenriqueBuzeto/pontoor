import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { createTimeEntry, listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { timeEntrySchema } from "@/lib/validations/time-entry";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const runtime = "nodejs";

const TZ = "America/Sao_Paulo";

async function getEmployeeTenant(employeeId: string) {
  const db = getDb();
  const [row] = await db
    .select({ tenantId: employees.tenantId })
    .from(employees)
    .where(and(eq(employees.id, employeeId), isNull(employees.deletedAt)))
    .limit(1);
  return row?.tenantId ?? null;
}

function getYmdInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  return { year, month, day };
}

function zonedWallTimeToUtcDate(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  ms?: number;
  timeZone: string;
}) {
  const utcGuess = new Date(
    Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      input.hour,
      input.minute,
      input.second ?? 0,
      input.ms ?? 0
    )
  );

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);

  const gotYear = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const gotMonth = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const gotDay = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  const gotHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const gotMinute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const gotSecond = Number(parts.find((p) => p.type === "second")?.value ?? "0");

  const asUtc = Date.UTC(gotYear, gotMonth - 1, gotDay, gotHour, gotMinute, gotSecond, 0);
  const offsetMs = asUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function getDayRangeInTZ(date: Date) {
  const ymd = getYmdInTimeZone(date, TZ);
  const start = zonedWallTimeToUtcDate({ ...ymd, hour: 0, minute: 0, second: 0, ms: 0, timeZone: TZ });
  const end = zonedWallTimeToUtcDate({ ...ymd, hour: 23, minute: 59, second: 59, ms: 999, timeZone: TZ });
  return { start, end };
}

function validateNextTimeEntry(entries: { type: string; occurredAt: Date }[], nextType: string): string | null {
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

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const raw = {
    type: json?.type,
    occurredAt: json?.occurredAt ? new Date(json.occurredAt) : new Date(),
    observation: json?.observation ?? undefined,
  };

  const employeeId = String(json?.employeeId ?? "");
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "Colaborador inválido." }, { status: 400 });
  }

  const tenantId = await getEmployeeTenant(employeeId);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Colaborador não encontrado." }, { status: 404 });
  }

  const parsed = timeEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().formErrors[0] ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    undefined;
  const userAgent = headersList.get("user-agent") ?? undefined;

  const { start, end } = getDayRangeInTZ(parsed.data.occurredAt);
  const existing = await listTimeEntriesByEmployee(tenantId, employeeId, start, end);
  const validationError = validateNextTimeEntry(
    existing.map((e) => ({ type: e.type, occurredAt: e.occurredAt })),
    parsed.data.type
  );
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  try {
    const entry = await createTimeEntry(tenantId, employeeId, {
      type: parsed.data.type,
      occurredAt: parsed.data.occurredAt,
      source: "kiosk",
      ipAddress: ip,
      userAgent,
      observation: parsed.data.observation,
    });

    const { recalculateDay } = await import("@/lib/services/time-calculation");
    await recalculateDay({ tenantId, employeeId, date: parsed.data.occurredAt });

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Erro ao registrar ponto." }, { status: 500 });
  }
}
