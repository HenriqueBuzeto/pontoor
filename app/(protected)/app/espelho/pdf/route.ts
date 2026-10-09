import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { getTenantById } from "@/lib/repositories/tenants";
import { getEmployeeById } from "@/lib/repositories/employees";
import { getWorkScheduleById } from "@/lib/repositories/work-schedules";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { listDailyCalculationsByEmployee } from "@/lib/repositories/time-calculations";
import { listHolidaysByRange } from "@/lib/repositories/holidays";
import { getNationalHolidaySet } from "@/lib/services/holidays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getMonthRangeInTZ(year: number, month: number) {
  const start = zonedWallTimeToUtcDate({ year, month, day: 1, hour: 0, minute: 0, second: 0, ms: 0, timeZone: TZ });
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0, 0));
  const { day } = getYmdInTimeZone(lastDay, TZ);
  const end = zonedWallTimeToUtcDate({ year, month, day, hour: 23, minute: 59, second: 59, ms: 999, timeZone: TZ });
  return { start, end };
}

function maskCpf(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return raw ?? "";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(d: Date | null) {
  if (!d) return "-";
  return d.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const dow = dt.toLocaleDateString("pt-BR", { weekday: "short", timeZone: TZ });
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} (${dow.replace(".", "").toUpperCase()})`;
}

function minutesToHHMM(mins: number | null | undefined) {
  const m = Number(mins ?? 0);
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseHHMM(input: string | null | undefined) {
  const s = String(input ?? "").trim();
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function minutesBetween(a: { hour: number; minute: number }, b: { hour: number; minute: number }) {
  return (b.hour * 60 + b.minute) - (a.hour * 60 + a.minute);
}

function dateToDateKey(input: unknown) {
  if (!input) return "";
  if (typeof input === "string") {
    // normalmente já vem como YYYY-MM-DD
    return input.slice(0, 10);
  }
  if (input instanceof Date) {
    // date (sem timezone) pode vir como Date; usa UTC para não deslocar o dia
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(input);
  }
  return String(input).slice(0, 10);
}

function buildHtml(params: {
  tenantName: string;
  employeeName: string;
  employeeRegistration: string;
  employeeCpf: string;
  departmentLabel: string;
  periodLabel: string;
  issuedAtLabel: string;
  scheduleLabel: string;
  scheduleSummaryHtml: string;
  rowsHtml: string;
  totalsHtml: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>Cartão de Ponto</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 4px;
      border-bottom: 2px solid #0f172a;
      align-items: flex-end;
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .subtitle {
      font-size: 10.5px;
      font-weight: 500;
      color: #334155;
    }
    .pill {
      margin-top: 3px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 9px;
      color: #334155;
    }
    .meta {
      font-size: 8.5px;
      color: #334155;
      text-align: right;
      white-space: nowrap;
      line-height: 1.35;
    }
    .meta strong { color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 4px; margin-top: 4px; }
    .card {
      border: 1px solid #0f172a;
      border-radius: 8px;
      padding: 6px 10px;
    }
    .card-title {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .kv {
      font-size: 9px;
      display: grid;
      grid-template-columns: 82px 1fr;
      row-gap: 2px;
      column-gap: 8px;
      align-items: baseline;
    }
    .k { color: #0f172a; font-weight: 800; }
    .v { color: #0f172a; }
    .muted { color: #64748b; }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #0f172a; padding: 4.6px 4px; font-size: 8.8px; line-height: 1.25; text-align: center; }
    th {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.04em;
      background: #f8fafc;
      padding: 5.5px 4px;
    }
    .table-zebra tbody tr:nth-child(odd) td { background: #ffffff; }
    .table-zebra tbody tr:nth-child(even) td { background: #f8fafc; }
    .align-right { text-align: right; }
    .align-left { text-align: left; }
    .balance-neg { color: #b91c1c; font-weight: 800; }
    .balance-pos { color: #0f172a; font-weight: 800; }
    .schedule-summary { font-size: 9px; display: grid; grid-template-columns: 72px 1fr; row-gap: 1.5px; column-gap: 8px; }
    .schedule-summary .k { font-weight: 800; }
    .sign {
      margin-top: 55px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-box {
      border-top: 1.5px solid #0f172a;
      padding-top: 8px;
      text-align: center;
      color: #0f172a;
      min-height: 58px;
    }
    .sign-role {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .sign-name {
      font-size: 9px;
      color: #334155;
      margin-top: 2px;
    }
    .sign-date {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="title">Cartão de Ponto</div>
      <div class="subtitle">Documento oficial para conferência mensal</div>
      <div class="pill">
        <span><strong>${escapeHtml(params.tenantName)}</strong></span>
        <span class="muted">•</span>
        <span>${escapeHtml(params.periodLabel)}</span>
      </div>
    </div>
    <div class="meta">
      <div><strong>Emitido em:</strong> ${escapeHtml(params.issuedAtLabel)}</div>
      <div class="muted">Fuso: Brasília (America/Sao_Paulo)</div>
    </div>
  </div>

  <div class="card" style="margin-top: 4px;">
    <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px; align-items: center;">
      <div class="kv">
        <div class="k">Colaborador:</div><div class="v"><strong>${escapeHtml(params.employeeName)}</strong> (Mat: ${escapeHtml(params.employeeRegistration)})</div>
        <div class="k">CPF / Depto:</div><div class="v">${escapeHtml(params.employeeCpf)} • ${escapeHtml(params.departmentLabel)}</div>
      </div>
      <div style="font-size: 8px; border-left: 1px solid #e2e8f0; padding-left: 8px;">
        <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px;">${escapeHtml(params.scheduleLabel)}</div>
        <div class="schedule-summary">
          ${params.scheduleSummaryHtml}
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top: 4px; border-radius: 8px;">
    <div class="card-title">Lançamentos do período</div>
    <table class="table-zebra">
      <thead>
        <tr>
          <th style="width: 105px;" class="align-left">Dia</th>
          <th style="width: 48px;">Ent 1</th>
          <th style="width: 48px;">Saí Alm.</th>
          <th style="width: 48px;">Vol. Alm.</th>
          <th style="width: 48px;">Saí 1</th>
          <th style="width: 58px;">Saída Meio</th>
          <th style="width: 58px;">Volta Meio</th>
          <th style="width: 48px;">Ent 3</th>
          <th style="width: 48px;">Saí 3</th>
          <th style="width: 54px;" class="align-right">Trab.</th>
          <th style="width: 54px;" class="align-right">Extra</th>
          <th style="width: 54px;" class="align-right">Saldo</th>
          <th style="width: 60px;">Obs</th>
        </tr>
      </thead>
      <tbody>
        ${params.rowsHtml}
      </tbody>
      <tfoot>
        ${params.totalsHtml}
      </tfoot>
    </table>

    <div class="sign">
      <div class="sign-box">
        <div class="sign-role">Assinatura do Colaborador</div>
        <div class="sign-name">${escapeHtml(params.employeeName)} (Matrícula: ${escapeHtml(params.employeeRegistration)})</div>
        <div class="sign-date">Data: ____/____/________</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Responsável / RH</div>
        <div class="sign-name">${escapeHtml(params.tenantName)}</div>
        <div class="sign-date">Data: ____/____/________</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();

  if (!tenantId || !user) {
    return new Response("Sem acesso.", { status: 401 });
  }

  const search = req.nextUrl.searchParams;
  const month = Number(search.get("month") ?? "0");
  const year = Number(search.get("year") ?? "0");

  if (!month || !year) {
    return new Response("Parâmetros inválidos.", { status: 400 });
  }

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const requestedEmployeeId = search.get("employeeId") ?? "";

  const effectiveEmployeeId = isAdmin
    ? requestedEmployeeId || (user.employeeId ?? "")
    : (user.employeeId ?? "");

  if (!effectiveEmployeeId) {
    return new Response("Usuário sem vínculo com colaborador.", { status: 400 });
  }

  const [tenant, employee] = await Promise.all([
    getTenantById(tenantId),
    getEmployeeById(tenantId, effectiveEmployeeId),
  ] as const);

  if (!employee) {
    return new Response("Colaborador não encontrado.", { status: 404 });
  }

  const { start, end } = getMonthRangeInTZ(year, month);

  const [schedule, entries, calcs] = await Promise.all([
    employee.workScheduleId ? getWorkScheduleById(tenantId, employee.workScheduleId) : Promise.resolve(null),
    listTimeEntriesByEmployee(tenantId, employee.id, start, end),
    listDailyCalculationsByEmployee(tenantId, employee.id, year, month),
  ]);

  const workScheduleLabel = schedule?.name ?? "Escala";
  const scheduleEntry = schedule?.entryTime ?? null;
  const scheduleExit = schedule?.exitTime ?? null;
  const scheduleBreakStart = schedule?.breakStart ?? null;
  const scheduleBreakEnd = schedule?.breakEnd ?? null;

  const workDays = (Array.isArray(schedule?.workDays) ? schedule!.workDays : [1, 2, 3, 4, 5, 6])
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => Number.isFinite(v));

  const scheduleSummaryHtml = (() => {
    const hasWeek = [1, 2, 3, 4, 5].some((d) => workDays.includes(d));
    const hasSat = workDays.includes(6);
    const hasSun = workDays.includes(0);

    const weekLabel = hasWeek
      ? (scheduleEntry && scheduleBreakStart && scheduleBreakEnd && scheduleExit
          ? `${scheduleEntry} / ${scheduleBreakStart} / ${scheduleBreakEnd} / ${scheduleExit}`
          : (scheduleEntry && scheduleExit ? `${scheduleEntry}–${scheduleExit}` : "08:00–18:00"))
      : "-";

    const satLabel = hasSat
      ? (scheduleEntry && scheduleExit ? `${scheduleEntry}–${scheduleExit}` : "09:00–13:00")
      : "-";
    const sunLabel = hasSun
      ? (scheduleEntry && scheduleExit ? `${scheduleEntry}–${scheduleExit}` : "08:00–18:00")
      : "-";

    const items: string[] = [];
    items.push(`<div class="k">Seg–Sex:</div><div>${escapeHtml(weekLabel)}</div>`);
    items.push(`<div class="k">Sábado:</div><div>${escapeHtml(satLabel)}</div>`);
    items.push(`<div class="k">Domingo:</div><div>${escapeHtml(sunLabel)}</div>`);
    return items.join("");
  })();

  const byDateKey = new Map<string, { occurredAt: Date; type: string; source?: string | null }[]>();
  for (const e of entries) {
    const occurred = e.occurredAt instanceof Date ? e.occurredAt : new Date(e.occurredAt as unknown as string);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(occurred);

    const arr = byDateKey.get(key) ?? [];
    const source = "source" in e ? (e.source as string | null | undefined) : null;
    arr.push({ occurredAt: occurred, type: e.type, source: source ?? null });
    byDateKey.set(key, arr);
  }

  const calcsByKey = new Map<string, (typeof calcs)[number]>();
  for (const c of calcs) {
    const k = dateToDateKey((c as { date?: unknown }).date);
    if (k) calcsByKey.set(k, c);
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const endKey = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const [manualHolidays, nationalHolidaySet] = await Promise.all([
    listHolidaysByRange(tenantId, startKey, endKey),
    getNationalHolidaySet(year),
  ]);

  const holidaySet = new Set<string>();
  for (const h of manualHolidays ?? []) {
    holidaySet.add(String(h.date).slice(0, 10));
  }
  for (const key of nationalHolidaySet) {
    if (key >= startKey && key <= endKey) holidaySet.add(key);
  }

  const entryHHMM = parseHHMM(scheduleEntry);
  const exitHHMM = parseHHMM(scheduleExit);
  const breakStartHHMM = parseHHMM(scheduleBreakStart);
  const breakEndHHMM = parseHHMM(scheduleBreakEnd);

  const weekdayForKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
    return dt.getUTCDay();
  };

  const expectedMinutesForDay = (key: string) => {
    if (holidaySet.has(key)) return 0;
    const weekday = weekdayForKey(key);
    const isWorkDay = workDays.includes(weekday);
    if (!isWorkDay) return 0;

    if (weekday === 6) {
      if (entryHHMM && exitHHMM) {
        return Math.max(0, minutesBetween(entryHHMM, exitHHMM));
      }
      return 4 * 60;
    }

    if (!entryHHMM || !exitHHMM) return 8 * 60;

    let minutes = minutesBetween(entryHHMM, exitHHMM);
    if (breakStartHHMM && breakEndHHMM) {
      minutes -= Math.max(0, minutesBetween(breakStartHHMM, breakEndHHMM));
    }
    return Math.max(0, minutes);
  };

  const today = new Date();
  const todayYmd = getYmdInTimeZone(today, TZ);
  const isCurrentMonth = year === todayYmd.year && month === todayYmd.month;

  const daySummaries = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const isFutureDay =
      year > todayYmd.year ||
      (year === todayYmd.year && month > todayYmd.month) ||
      (isCurrentMonth && day > todayYmd.day);

    const isToday = isCurrentMonth && day === todayYmd.day;

    const dayEntries = (byDateKey.get(key) ?? []).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    let ent1: Date | null = null;
    let saiAlmoco: Date | null = null;
    let voltaAlmoco: Date | null = null;
    let sai1: Date | null = null;
    let saidaMeio: Date | null = null;
    let voltaMeio: Date | null = null;
    let ent3: Date | null = null;
    let sai3: Date | null = null;

    let sawMainOut = false;
    let sawExtraIn = false;

    for (const it of dayEntries) {
      if (it.type === "clock_in") {
        if (!ent1) {
          ent1 = it.occurredAt;
          continue;
        }
        if (sawMainOut && !ent3) {
          ent3 = it.occurredAt;
          sawExtraIn = true;
          continue;
        }
      }

      if (it.type === "break_start") {
        if (!saiAlmoco) {
          saiAlmoco = it.occurredAt;
          continue;
        }
      }

      if (it.type === "break_end") {
        if (!voltaAlmoco) {
          voltaAlmoco = it.occurredAt;
          continue;
        }
      }

      if (it.type === "pause_start") {
        if (!saidaMeio) {
          saidaMeio = it.occurredAt;
          continue;
        }
      }

      if (it.type === "pause_end") {
        if (!voltaMeio) {
          voltaMeio = it.occurredAt;
          continue;
        }
      }

      if (it.type === "clock_out") {
        if (!sai1) {
          sai1 = it.occurredAt;
          sawMainOut = true;
          continue;
        }
        if (sawExtraIn && !sai3) {
          sai3 = it.occurredAt;
          continue;
        }
      }
    }

    const calc = calcsByKey.get(key);
    const expected = Number(calc?.expectedMinutes ?? expectedMinutesForDay(key));
    const weekday = weekdayForKey(key);
    const isSaturday = weekday === 6;

    const hasAnyEntry = dayEntries.length > 0;
    const hasRequiredBreak = !!(breakStartHHMM && breakEndHHMM);
    const mainComplete = isSaturday || !hasRequiredBreak
      ? !!(ent1 && sai1)
      : !!(ent1 && saiAlmoco && voltaAlmoco && sai1);

    // Se for dia futuro ou dia de hoje em andamento, não contabiliza como falta nem negativa
    const treatAsAbsent = !isFutureDay && !isToday && expected > 0 && (!hasAnyEntry || !mainComplete);

    let calculatedWorked = Number(calc?.workedMinutes ?? 0);
    if (!calc && ent1 && sai1) {
      if (saiAlmoco && voltaAlmoco) {
        calculatedWorked = Math.max(0, Math.round((saiAlmoco.getTime() - ent1.getTime()) / 60000)) +
          Math.max(0, Math.round((sai1.getTime() - voltaAlmoco.getTime()) / 60000));
      } else {
        calculatedWorked = Math.max(0, Math.round((sai1.getTime() - ent1.getTime()) / 60000));
      }
      if (ent3 && sai3) {
        calculatedWorked += Math.max(0, Math.round((sai3.getTime() - ent3.getTime()) / 60000));
      }

      // Desconta pausas ocorridas no dia
      let pStart: Date | null = null;
      for (const it of dayEntries) {
        if (it.type === "pause_start" && !pStart) pStart = it.occurredAt;
        if (it.type === "pause_end" && pStart) {
          calculatedWorked = Math.max(0, calculatedWorked - Math.round((it.occurredAt.getTime() - pStart.getTime()) / 60000));
          pStart = null;
        }
      }
    }

    const hasPause = dayEntries.some((e) => e.type === "pause_start");

    let workedMinutes = isFutureDay ? 0 : (treatAsAbsent ? 0 : calculatedWorked);
    let rawBalance = 0;
    let overtimeMinutes = 0;

    if (isFutureDay) {
      rawBalance = 0;
      overtimeMinutes = 0;
      workedMinutes = 0;
    } else if (treatAsAbsent) {
      rawBalance = -expected;
      overtimeMinutes = 0;
    } else if (calc) {
      const calcBalance = Number(calc.balanceMinutes ?? 0);
      rawBalance = isToday && calcBalance < 0 ? 0 : calcBalance;
      overtimeMinutes = Number(calc.overtimeMinutes ?? 0);
    } else {
      const diff = workedMinutes - expected;
      rawBalance = isToday && diff < 0 ? 0 : diff;
      overtimeMinutes = Math.max(0, rawBalance);
    }

    const worked = minutesToHHMM(workedMinutes);
    const overtime = minutesToHHMM(overtimeMinutes);
    const balance = minutesToHHMM(rawBalance);

    let obs = "";
    if (dayEntries.some((e) => e.source === "manual_adjustment")) {
      obs = "Ajuste";
    } else if (isFutureDay) {
      obs = "";
    } else if (treatAsAbsent) {
      obs = hasAnyEntry ? "Incompleto" : "Falta";
    } else if (hasPause) {
      obs = "Pausa";
    }

    const balanceClass = rawBalance < 0 ? "balance-neg" : "balance-pos";

    const rowHtml = `
<tr>
  <td class="align-left">${escapeHtml(formatDateLabel(key))}</td>
  <td>${escapeHtml(formatTime(ent1))}</td>
  <td>${escapeHtml(formatTime(saiAlmoco))}</td>
  <td>${escapeHtml(formatTime(voltaAlmoco))}</td>
  <td>${escapeHtml(formatTime(sai1))}</td>
  <td>${escapeHtml(formatTime(saidaMeio))}</td>
  <td>${escapeHtml(formatTime(voltaMeio))}</td>
  <td>${escapeHtml(formatTime(ent3))}</td>
  <td>${escapeHtml(formatTime(sai3))}</td>
  <td class="align-right">${escapeHtml(worked)}</td>
  <td class="align-right">${escapeHtml(overtime)}</td>
  <td class="align-right ${balanceClass}">${escapeHtml(balance)}</td>
  <td>${escapeHtml(obs)}</td>
</tr>`;

    return {
      key,
      expectedMinutes: isFutureDay ? 0 : expected,
      workedMinutes,
      overtimeMinutes,
      balanceMinutes: rawBalance,
      rowHtml,
    };
  });

  const rowsHtml = daySummaries.map((d) => d.rowHtml).join("");

  const totalWorked = daySummaries.reduce((acc, c) => acc + (c.workedMinutes ?? 0), 0);
  const totalBalance = daySummaries.reduce((acc, c) => acc + (c.balanceMinutes ?? 0), 0);
  const totalOvertime = daySummaries.reduce((acc, c) => acc + (c.overtimeMinutes ?? 0), 0);

  const totalsHtml = `
<tr>
  <td colspan="9" class="align-left"><strong>Totais do mês</strong></td>
  <td class="align-right"><strong>${escapeHtml(minutesToHHMM(totalWorked))}</strong></td>
  <td class="align-right"><strong>${escapeHtml(minutesToHHMM(totalOvertime))}</strong></td>
  <td class="align-right ${totalBalance < 0 ? "balance-neg" : "balance-pos"}"><strong>${escapeHtml(minutesToHHMM(totalBalance))}</strong></td>
  <td class="muted"></td>
</tr>`;

  const periodLabel = `De 01/${String(month).padStart(2, "0")}/${year} até ${String(daysInMonth).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  const issuedAtLabel = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const html = buildHtml({
    tenantName: tenant?.name ?? "Tenant",
    employeeName: employee.name,
    employeeRegistration: employee.registration,
    employeeCpf: maskCpf(employee.cpf),
    departmentLabel: "Otica",
    periodLabel,
    issuedAtLabel,
    scheduleLabel: workScheduleLabel,
    scheduleSummaryHtml,
    rowsHtml,
    totalsHtml,
  });

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "5mm", right: "8mm", bottom: "5mm", left: "8mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-size:8px;padding:0 8mm;color:#64748b;display:flex;justify-content:space-between;">
          <div>Cartão de Ponto Oficial</div>
          <div>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
        </div>
      `,
    });

    const fileName = `cartao-ponto-${employee.registration}-${String(month).padStart(2, "0")}-${year}.pdf`;

    const body = Buffer.from(pdf);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } finally {
    await browser.close();
  }
}
