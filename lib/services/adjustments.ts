import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { adjustments, timeEntries } from "@/lib/db/schema";
import type { ApprovalStatus } from "@/lib/db/schema/adjustments";
import type { NewTimeEntry } from "@/lib/db/schema/time-entries";
import { recalculateDayInTransaction } from "@/lib/services/time-calculation";

type Tx = Pick<Db, "delete" | "insert" | "update" | "select">;

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
  if (v === "00:00") return undefined;
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
      !t || t === "—" || t === "00:00";
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
  const toDate = (time?: string) => {
    if (!time) return null;
    const [h, m] = time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
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
      const items = buildEntriesFromSchedule(date, schedule);

      console.log("[approveAdjustment] built schedule", {
        date,
        schedule,
        items: items.map((it) => ({ type: it.type, occurredAt: it.occurredAt.toISOString() })),
      });

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

