import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { adjustments, timeEntries } from "@/lib/db/schema";
import type { ApprovalStatus } from "@/lib/db/schema/adjustments";
import type { NewTimeEntry } from "@/lib/db/schema/time-entries";
import { recalculateDayInTransaction } from "@/lib/services/time-calculation";

type Tx = Pick<Db, "delete" | "insert" | "update" | "select">;

const TZ = "America/Sao_Paulo";

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
  timeZone: string;
}) {
  const utcGuess = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0, 0)
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

export type ParsedSchedule = {
  expediente: { start?: string; end?: string };
  almoco: { start?: string; end?: string };
  extra: { start?: string; end?: string };
};

export type ApproveAdjustmentOptions = {
  reviewComment?: string;
  /** Horários opcionais enviados explicitamente pelo formulário de aprovação. */
  expStart?: string;
  expEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  extraStart?: string;
  extraEnd?: string;
};

function normalizeTime(value?: string | null): string | undefined {
  const v = (value ?? "").trim();
  if (!v) return undefined;
  if (v === "—") return undefined;
  return v;
}

export function buildScheduleFromForm(opts: ApproveAdjustmentOptions): ParsedSchedule | null {
  const expStart = normalizeTime(opts.expStart);
  const expEnd = normalizeTime(opts.expEnd);
  const lunchStart = normalizeTime(opts.lunchStart);
  const lunchEnd = normalizeTime(opts.lunchEnd);
  const extraStart = normalizeTime(opts.extraStart);
  const extraEnd = normalizeTime(opts.extraEnd);

  const hasAny =
    expStart ||
    expEnd ||
    lunchStart ||
    lunchEnd ||
    extraStart ||
    extraEnd;

  if (!hasAny) return null;

  return {
    expediente: { start: expStart, end: expEnd },
    almoco: { start: lunchStart, end: lunchEnd },
    extra: { start: extraStart, end: extraEnd },
  };
}

export function extractScheduleFromReason(reason: string): ParsedSchedule | null {
  const lines = reason.split(/\r?\n/).map((l) => l.trim());
  const hasMarker = lines.some((l) => l.startsWith("Horários informados para correção:"));
  if (!hasMarker) return null;

  const parseLine = (prefix: string) => {
    const line = [...lines].reverse().find((l) => l.startsWith(prefix));
    if (!line) return { start: undefined, end: undefined };
    const rest = line.slice(prefix.length).trim(); // ex.: "08:00 até 18:00"
    const [start, , end] = rest.split(" ");
    const isEmptyTime = (t?: string) =>
      !t || t === "—";
    return {
      start: !isEmptyTime(start) ? start : undefined,
      end: !isEmptyTime(end) ? end : undefined,
    };
  };

  return {
    expediente: parseLine("- Expediente:"),
    almoco: parseLine("- Almoço:"),
    extra: parseLine("- Hora extra:"),
  };
}

export function buildEntriesFromSchedule(
  date: Date,
  schedule: ParsedSchedule
): { type: NewTimeEntry["type"]; occurredAt: Date }[] {
  const ymd = getYmdInTimeZone(date, TZ);

  const toDate = (time?: string) => {
    if (!time || time === "00:00" || time === "—") return null;
    const [h, m] = time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return zonedWallTimeToUtcDate({
      ...ymd,
      hour: h,
      minute: m,
      timeZone: TZ,
    });
  };

  const start = toDate(schedule.expediente.start);
  const end = toDate(schedule.expediente.end);
  const lunchStart = toDate(schedule.almoco.start);
  const lunchEnd = toDate(schedule.almoco.end);
  const extraStart = toDate(schedule.extra.start);
  const extraEnd = toDate(schedule.extra.end);

  const items: { type: NewTimeEntry["type"]; occurredAt: Date }[] = [];

  if (start) {
    items.push({ type: "clock_in", occurredAt: start });
  }
  if (lunchStart) {
    items.push({ type: "break_start", occurredAt: lunchStart });
  }
  if (lunchEnd) {
    items.push({ type: "break_end", occurredAt: lunchEnd });
  }
  if (end) {
    items.push({ type: "clock_out", occurredAt: end });
  }
  if (extraStart && extraEnd) {
    items.push({ type: "clock_in", occurredAt: extraStart });
    items.push({ type: "clock_out", occurredAt: extraEnd });
  }

  return items.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

async function overwriteTimeEntriesForDayInTx(
  tx: Tx,
  tenantId: string,
  employeeId: string,
  date: Date,
  items: { type: NewTimeEntry["type"]; occurredAt: Date }[]
) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const deleted = await tx
    .delete(timeEntries)
    .where(
      and(
        eq(timeEntries.tenantId, tenantId),
        eq(timeEntries.employeeId, employeeId),
        gte(timeEntries.occurredAt, start),
        lte(timeEntries.occurredAt, end)
      )
    )
    .returning({ id: timeEntries.id, occurredAt: timeEntries.occurredAt, type: timeEntries.type });

  console.log("[overwriteTimeEntriesForDayInTx] deleted rows", {
    tenantId,
    employeeId,
    date,
    deletedCount: deleted.length,
    rows: deleted.map((d) => ({
      id: d.id,
      type: d.type,
      occurredAt: d.occurredAt.toISOString(),
    })),
  });

  if (items.length === 0) return;

  await tx.insert(timeEntries).values(
    items.map((it) => ({
      tenantId,
      employeeId,
      type: it.type,
      occurredAt: it.occurredAt,
      source: "manual_adjustment",
      ipAddress: null,
      userAgent: null,
      observation: "Ajuste aprovado pelo administrador",
    }))
  );
}

function dateToTimeString(date: Date, timeZone: string = TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function mapEntriesToSchedule(
  entries: { occurredAt: Date; type: string }[],
  timeZone: string = TZ
): ParsedSchedule {
  const sorted = [...entries].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
  );

  let firstIn: Date | null = null;
  let lastOut: Date | null = null;
  let lunchStart: Date | null = null;
  let lunchEnd: Date | null = null;
  let extraStart: Date | null = null;
  let extraEnd: Date | null = null;

  for (const item of sorted) {
    const { occurredAt: time, type } = item;

    if (type === "clock_in") {
      if (!firstIn) {
        firstIn = time;
      } else if (lastOut && !extraStart) {
        extraStart = time;
      }
    }

    if (type === "clock_out") {
      if (!lastOut) {
        lastOut = time;
      } else if (extraStart && !extraEnd) {
        extraEnd = time;
      } else {
        lastOut = time;
      }
    }

    if (type === "break_start" && !lunchStart) {
      lunchStart = time;
    }
    if (type === "break_end" && lunchStart && !lunchEnd) {
      lunchEnd = time;
    }
  }

  const toStr = (d: Date | null) => (d ? dateToTimeString(d, timeZone) : undefined);

  return {
    expediente: { start: toStr(firstIn), end: toStr(lastOut) },
    almoco: { start: toStr(lunchStart), end: toStr(lunchEnd) },
    extra: { start: toStr(extraStart), end: toStr(extraEnd) },
  };
}

function mergeSchedules(existing: ParsedSchedule, incoming: ParsedSchedule): ParsedSchedule {
  return {
    expediente: {
      start: incoming.expediente.start !== undefined ? incoming.expediente.start : existing.expediente.start,
      end: incoming.expediente.end !== undefined ? incoming.expediente.end : existing.expediente.end,
    },
    almoco: {
      start: incoming.almoco.start !== undefined ? incoming.almoco.start : existing.almoco.start,
      end: incoming.almoco.end !== undefined ? incoming.almoco.end : existing.almoco.end,
    },
    extra: {
      start: incoming.extra.start !== undefined ? incoming.extra.start : existing.extra.start,
      end: incoming.extra.end !== undefined ? incoming.extra.end : existing.extra.end,
    },
  };
}

export async function approveAdjustmentWithRecalculation(
  tenantId: string,
  adjustmentId: string,
  reviewerId: string,
  opts: ApproveAdjustmentOptions
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    console.log("[approveAdjustment] start", {
      tenantId,
      adjustmentId,
      reviewerId,
      opts,
    });

    const [adj] = await tx
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.id, adjustmentId)))
      .limit(1);

    if (!adj) {
      return { error: "Justificativa não encontrada." as const };
    }
    if (adj.status !== "pending") {
      return { error: "Justificativa já revisada." as const };
    }

    const now = new Date();

    console.log("[approveAdjustment] loaded adjustment", {
      id: adj.id,
      employeeId: adj.employeeId,
      date: adj.date,
      type: adj.type,
      statusBefore: adj.status,
    });

    await tx
      .update(adjustments)
      .set({
        status: "approved" as ApprovalStatus,
        reviewedById: reviewerId,
        reviewComment: opts.reviewComment ?? null,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.id, adjustmentId)));

    let schedule = buildScheduleFromForm(opts);
    if (!schedule) {
      schedule = extractScheduleFromReason(adj.reason);
    }

    if (schedule) {
      const date = new Date(adj.date);

      // Marcações existentes ANTES do overwrite
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      const beforeEntries = await tx
        .select({
          id: timeEntries.id,
          type: timeEntries.type,
          occurredAt: timeEntries.occurredAt,
        })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.tenantId, tenantId),
            eq(timeEntries.employeeId, adj.employeeId),
            gte(timeEntries.occurredAt, start),
            lte(timeEntries.occurredAt, end)
          )
        );

      console.log("[approveAdjustment] time_entries BEFORE overwrite", {
        count: beforeEntries.length,
        rows: beforeEntries.map((e) => ({
          id: e.id,
          type: e.type,
          occurredAt: e.occurredAt.toISOString(),
        })),
      });

      const existingSchedule = mapEntriesToSchedule(beforeEntries, TZ);
      const mergedSchedule = mergeSchedules(existingSchedule, schedule);
      const items = buildEntriesFromSchedule(date, mergedSchedule);

      console.log("[approveAdjustment] merged schedule", {
        date,
        mergedSchedule,
        items: items.map((it) => ({ type: it.type, occurredAt: it.occurredAt.toISOString() })),
      });

      await overwriteTimeEntriesForDayInTx(tx, tenantId, adj.employeeId, date, items);

      const afterEntries = await tx
        .select({
          id: timeEntries.id,
          type: timeEntries.type,
          occurredAt: timeEntries.occurredAt,
        })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.tenantId, tenantId),
            eq(timeEntries.employeeId, adj.employeeId),
            gte(timeEntries.occurredAt, start),
            lte(timeEntries.occurredAt, end)
          )
        );

      console.log("[approveAdjustment] time_entries AFTER overwrite", {
        count: afterEntries.length,
        rows: afterEntries.map((e) => ({
          id: e.id,
          type: e.type,
          occurredAt: e.occurredAt.toISOString(),
        })),
      });

      await recalculateDayInTransaction(tx, {
        tenantId,
        employeeId: adj.employeeId,
        date,
      });
    }

    return { ok: true as const };
  });
}


