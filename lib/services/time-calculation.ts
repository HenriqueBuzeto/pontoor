import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { employees, timeEntries, timeCalculations, workSchedules } from "@/lib/db/schema";
import { isManualHoliday } from "@/lib/repositories/holidays";
import { isNationalHoliday } from "@/lib/services/holidays";

type Tx = Pick<Db, "select" | "insert" | "update">;

export type DailyCalculationInput = {
  tenantId: string;
  employeeId: string;
  date: Date;
};

export type DailyCalculationResult = {
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  overtimeMinutes: number;
  absent: boolean;
  complete: boolean;
};

function parseTimeToHoursMinutes(raw: unknown): { hours: number; minutes: number } | null {
  if (!raw) return null;
  const s = String(raw);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return { hours, minutes };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Calcula métricas de jornada para um dia a partir das marcações brutas. */
function calculateDayFromEntries(
  entries: { occurredAt: Date; type: (typeof timeEntries.$inferSelect)["type"] }[],
  date: Date
): DailyCalculationResult {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isSunday = current.getDay() === 0;

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

  let workedMinutes = 0;
  const hasValidExtra = !!(extraStart && extraEnd && extraEnd > extraStart);

  if (firstIn && lastOut) {
    const endOfMain =
      hasValidExtra && extraStart && extraStart < lastOut ? extraStart : lastOut;

    if (lunchStart && lunchEnd && lunchStart > firstIn && lunchEnd < endOfMain) {
      workedMinutes += Math.max(
        0,
        Math.round((lunchStart.getTime() - firstIn.getTime()) / 60000)
      );
      workedMinutes += Math.max(
        0,
        Math.round((endOfMain.getTime() - lunchEnd.getTime()) / 60000)
      );
    } else {
      workedMinutes += Math.max(
        0,
        Math.round((endOfMain.getTime() - firstIn.getTime()) / 60000)
      );
    }
  }

  if (hasValidExtra && extraStart && extraEnd) {
    workedMinutes += Math.max(
      0,
      Math.round((extraEnd.getTime() - extraStart.getTime()) / 60000)
    );
  }

  const complete =
    !isSunday &&
    ((firstIn && lastOut) || (!firstIn && !lastOut)) &&
    (!lunchStart || !!lunchEnd) &&
    (!extraStart || !!extraEnd);

  const expectedMinutes = isSunday ? 0 : 8 * 60;
  const balanceMinutes = workedMinutes - expectedMinutes;
  const overtimeMinutes = Math.max(0, balanceMinutes);
  const absent = expectedMinutes > 0 && workedMinutes === 0;

  return {
    workedMinutes,
    expectedMinutes,
    balanceMinutes,
    overtimeMinutes,
    absent,
    complete,
  };
}

/** Recalcula a jornada diária e grava em `time_calculations` dentro de uma transação existente. */
export async function recalculateDayInTransaction(
  tx: Tx,
  input: DailyCalculationInput
): Promise<DailyCalculationResult> {
  const { tenantId, employeeId, date } = input;

  // time_calculations.date é um campo DATE; usamos a chave YYYY-MM-DD
  const dateKey = date.toISOString().slice(0, 10);

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const [employeeRow] = await tx
    .select({
      workScheduleId: employees.workScheduleId,
    })
    .from(employees)
    .where(and(eq(employees.tenantId, tenantId), eq(employees.id, employeeId)))
    .limit(1);

  const scheduleId = employeeRow?.workScheduleId ?? null;
  const [scheduleRow] = scheduleId
    ? await tx
        .select({
          exitTime: workSchedules.exitTime,
          entryTime: workSchedules.entryTime,
          breakMinutes: workSchedules.breakMinutes,
          dailyHours: workSchedules.dailyHours,
          workDays: workSchedules.workDays,
        })
        .from(workSchedules)
        .where(and(eq(workSchedules.tenantId, tenantId), eq(workSchedules.id, scheduleId)))
        .limit(1)
    : [null];

  const entries = await tx
    .select({
      occurredAt: timeEntries.occurredAt,
      type: timeEntries.type,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.tenantId, tenantId),
        eq(timeEntries.employeeId, employeeId),
        gte(timeEntries.occurredAt, start),
        lte(timeEntries.occurredAt, end)
      )
    );

  const baseCalc = calculateDayFromEntries(entries, date);

  const currentDay = startOfDay(date);
  const today = startOfDay(new Date());
  const isToday = currentDay.getTime() === today.getTime();

  const weekday = currentDay.getDay();
  const scheduleWorkDays = Array.isArray(scheduleRow?.workDays) ? scheduleRow?.workDays : null;
  const isWorkDay = scheduleWorkDays ? scheduleWorkDays.includes(weekday) : weekday !== 0;

  const isHoliday =
    (await isManualHoliday(tenantId, dateKey)) || (await isNationalHoliday(dateKey));

  const defaultExpectedMinutes = weekday === 6 ? 4 * 60 : 8 * 60;
  const expectedMinutes = isHoliday ? 0 : isWorkDay ? (scheduleRow?.dailyHours ?? defaultExpectedMinutes) : 0;

  const holidayMultiplier = isHoliday && baseCalc.workedMinutes > 0 ? 2 : 1;
  const workedForBalance = baseCalc.workedMinutes * holidayMultiplier;

  let calc: DailyCalculationResult = {
    ...baseCalc,
    expectedMinutes,
    balanceMinutes: workedForBalance - expectedMinutes,
    overtimeMinutes: Math.max(0, workedForBalance - expectedMinutes),
    absent: expectedMinutes > 0 && baseCalc.workedMinutes === 0,
  };

  if (isToday && isWorkDay && !calc.complete) {
    const now = new Date();
    const exitHm = parseTimeToHoursMinutes(scheduleRow?.exitTime);
    const entryHm = parseTimeToHoursMinutes(scheduleRow?.entryTime);
    const breakMinutes = scheduleRow?.breakMinutes ?? 60;

    let shiftEnd: Date | null = null;
    if (exitHm) {
      shiftEnd = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        exitHm.hours,
        exitHm.minutes,
        0,
        0
      );
    } else if (entryHm && expectedMinutes > 0) {
      const total = expectedMinutes + breakMinutes;
      shiftEnd = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        entryHm.hours,
        entryHm.minutes,
        0,
        0
      );
      shiftEnd = new Date(shiftEnd.getTime() + total * 60000);
    }

    if (!shiftEnd || now < shiftEnd) {
      calc = {
        ...calc,
        balanceMinutes: 0,
        overtimeMinutes: 0,
        absent: false,
      };
    }
  }

  console.log("[recalculateDayInTransaction] input", {
    tenantId,
    employeeId,
    date,
    dateKey,
    entryCount: entries.length,
    entries: entries.map((e) => ({
      occurredAt: e.occurredAt.toISOString(),
      type: e.type,
    })),
    calc,
  });

  const [updated] = await tx
    .update(timeCalculations)
    .set({
      workedMinutes: calc.workedMinutes,
      expectedMinutes: calc.expectedMinutes,
      balanceMinutes: calc.balanceMinutes,
      overtimeMinutes: calc.overtimeMinutes,
      absent: calc.absent,
    })
    .where(
      and(
        eq(timeCalculations.tenantId, tenantId),
        eq(timeCalculations.employeeId, employeeId),
        eq(timeCalculations.date, dateKey)
      )
    )
    .returning({ id: timeCalculations.id });

  if (!updated) {
    await tx.insert(timeCalculations).values({
      tenantId,
      employeeId,
      date: dateKey,
      workedMinutes: calc.workedMinutes,
      expectedMinutes: calc.expectedMinutes,
      balanceMinutes: calc.balanceMinutes,
      overtimeMinutes: calc.overtimeMinutes,
      absent: calc.absent,
      // demais campos (lateMinutes, etc.) podem ser preenchidos em evoluções futuras
    });
  }

  const [row] = await tx
    .select()
    .from(timeCalculations)
    .where(
      and(
        eq(timeCalculations.tenantId, tenantId),
        eq(timeCalculations.employeeId, employeeId),
        eq(timeCalculations.date, dateKey)
      )
    )
    .limit(1);

  console.log("[recalculateDayInTransaction] time_calculations AFTER", {
    tenantId,
    employeeId,
    dateKey,
    row,
  });

  return calc;
}

/** Versão conveniente fora de transação, usada em scripts/eventuais. */
export async function recalculateDay(input: DailyCalculationInput) {
  const db = getDb();
  return db.transaction((tx) => recalculateDayInTransaction(tx, input));
}

