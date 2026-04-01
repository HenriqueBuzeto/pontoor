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

function buildHtml(params: {
  tenantName: string;
  employeeName: string;
  employeeRegistration: string;
  employeeCpf: string;
  departmentLabel: string;
  periodLabel: string;
  issuedAtLabel: string;
  scheduleLabel: string;
  scheduleDaysTable: string;
  rowsHtml: string;
  totalsHtml: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>Cartão de Ponto</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif;
      color: #0f172a;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 0 0 10px 0;
      border-bottom: 2px solid #0f172a;
      align-items: flex-end;
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .subtitle {
      font-size: 14px;
      font-weight: 500;
      color: #334155;
    }
    .pill {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 10px;
      color: #334155;
    }
    .meta {
      font-size: 10px;
      color: #334155;
      text-align: right;
      white-space: nowrap;
      line-height: 1.45;
    }
    .meta strong { color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; margin-top: 10px; }
    .card {
      border: 1px solid #0f172a;
      border-radius: 10px;
      padding: 10px;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .kv {
      font-size: 10.5px;
      display: grid;
      grid-template-columns: 110px 1fr;
      row-gap: 6px;
      column-gap: 10px;
      align-items: baseline;
    }
    .k { color: #0f172a; font-weight: 800; }
    .v { color: #0f172a; }
    .muted { color: #64748b; }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #0f172a; padding: 5px 7px; font-size: 9.8px; }
    th {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.6px;
      letter-spacing: 0.06em;
      background: #f8fafc;
    }
    .table-zebra tbody tr:nth-child(odd) td { background: #ffffff; }
    .table-zebra tbody tr:nth-child(even) td { background: #f8fafc; }
    .align-right { text-align: right; }
    .balance-neg { color: #b91c1c; font-weight: 800; }
    .balance-pos { color: #0f172a; font-weight: 800; }
    .sign { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .sign > div { border-top: 1px solid #0f172a; padding-top: 7px; font-size: 10px; text-align: center; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="title">Cartão de Ponto</div>
      <div class="subtitle">Documento oficial para conferência mensal</div>
      <div class="pill">
        <span><strong>${escapeHtml(params.tenantName)}</strong></span>
        <span class="muted">|</span>
        <span>${escapeHtml(params.periodLabel)}</span>
      </div>
    </div>
    <div class="meta">
      <div><strong>Emitido em</strong> ${escapeHtml(params.issuedAtLabel)}</div>
      <div class="muted">Fuso: Brasília (America/Sao_Paulo)</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Colaborador</div>
      <div class="kv">
        <div class="k">Nome:</div><div class="v">${escapeHtml(params.employeeName)}</div>
        <div class="k">Matrícula:</div><div class="v">${escapeHtml(params.employeeRegistration)}</div>
        <div class="k">CPF:</div><div class="v">${escapeHtml(params.employeeCpf)}</div>
        <div class="k">Departamento:</div><div class="v">${escapeHtml(params.departmentLabel)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Horário de trabalho</div>
      <div style="font-size:11px;margin-bottom:6px;"><strong>${escapeHtml(params.scheduleLabel)}</strong></div>
      <table class="table-zebra">
        <thead>
          <tr>
            <th>Dia</th>
            <th>Ent.</th>
            <th>Saí. Alm.</th>
            <th>Vol. Alm.</th>
            <th>Saí.</th>
          </tr>
        </thead>
        <tbody>
          ${params.scheduleDaysTable}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card" style="margin-top:10px; border-radius: 12px;">
    <div class="card-title">Lançamentos do período</div>
    <table class="table-zebra">
      <thead>
        <tr>
          <th style="width: 120px;">Dia</th>
          <th>Previsto</th>
          <th style="width: 55px;">Ent 1</th>
          <th style="width: 55px;">Saí Alm.</th>
          <th style="width: 55px;">Vol. Alm.</th>
          <th style="width: 55px;">Saí 1</th>
          <th style="width: 55px;">Ent 3</th>
          <th style="width: 55px;">Saí 3</th>
          <th style="width: 62px;" class="align-right">Trab.</th>
          <th style="width: 62px;" class="align-right">Extra</th>
          <th style="width: 62px;" class="align-right">Saldo</th>
          <th>Obs</th>
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
      <div>Assinatura do colaborador</div>
      <div>Assinatura do responsável</div>
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

  const [entries, calcs, schedule] = await Promise.all([
    listTimeEntriesByEmployee(tenantId, employee.id, start, end),
    listDailyCalculationsByEmployee(tenantId, employee.id, year, month),
    employee.workScheduleId ? getWorkScheduleById(tenantId, employee.workScheduleId) : Promise.resolve(null),
  ] as const);

  const workScheduleLabel = schedule?.name ?? "Escala";
  const scheduleEntry = schedule?.entryTime ?? null;
  const scheduleExit = schedule?.exitTime ?? null;
  const scheduleBreakStart = schedule?.breakStart ?? null;
  const scheduleBreakEnd = schedule?.breakEnd ?? null;

  const scheduleDays = [
    { k: "SEG", w: 1 },
    { k: "TER", w: 2 },
    { k: "QUA", w: 3 },
    { k: "QUI", w: 4 },
    { k: "SEX", w: 5 },
    { k: "SÁB", w: 6 },
    { k: "DOM", w: 0 },
  ];

  const workDays = Array.isArray(schedule?.workDays) ? schedule!.workDays : [1, 2, 3, 4, 5];
  const scheduleDaysTable = scheduleDays
    .map((d) => {
      const isWork = workDays.includes(d.w);
      const ent = isWork ? (scheduleEntry ?? "-") : "-";
      const sAlm = isWork ? (scheduleBreakStart ?? "-") : "-";
      const vAlm = isWork ? (scheduleBreakEnd ?? "-") : "-";
      const sai = isWork ? (scheduleExit ?? "-") : "-";
      return `<tr><td>${d.k}</td><td>${escapeHtml(ent)}</td><td>${escapeHtml(sAlm)}</td><td>${escapeHtml(vAlm)}</td><td>${escapeHtml(sai)}</td></tr>`;
    })
    .join("");

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

  const daysInMonth = new Date(year, month, 0).getDate();

  const rowsHtml = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayEntries = (byDateKey.get(key) ?? []).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    // Padrão esperado:
    // Ent1 (clock_in) -> Saí almoço (break_start) -> Volta almoço (break_end) -> Saí1 (clock_out)
    // Hora extra opcional: Ent3 (clock_in) -> Saí3 (clock_out)
    let ent1: Date | null = null;
    let saiAlmoco: Date | null = null;
    let voltaAlmoco: Date | null = null;
    let sai1: Date | null = null;
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

      if (it.type === "clock_out") {
        if (!sai1) {
          // primeira saída do dia vira saída principal
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

    const calc = calcs.find((c) => String(c.date) === key);

    const previsto = scheduleEntry && scheduleExit ? `${scheduleEntry}-${scheduleExit}` : "-";
    const worked = minutesToHHMM(calc?.workedMinutes ?? 0);
    const overtime = minutesToHHMM(calc?.overtimeMinutes ?? 0);
    const rawBalance = Number(calc?.balanceMinutes ?? 0);
    const balance = minutesToHHMM(rawBalance);
    const obs = dayEntries.some((e) => e.source === "manual_adjustment") ? "Ajuste" : "";

    const balanceClass = rawBalance < 0 ? "balance-neg" : "balance-pos";

    return `
<tr>
  <td>${escapeHtml(formatDateLabel(key))}</td>
  <td>${escapeHtml(previsto)}</td>
  <td>${escapeHtml(formatTime(ent1))}</td>
  <td>${escapeHtml(formatTime(saiAlmoco))}</td>
  <td>${escapeHtml(formatTime(voltaAlmoco))}</td>
  <td>${escapeHtml(formatTime(sai1))}</td>
  <td>${escapeHtml(formatTime(ent3))}</td>
  <td>${escapeHtml(formatTime(sai3))}</td>
  <td class="align-right">${escapeHtml(worked)}</td>
  <td class="align-right">${escapeHtml(overtime)}</td>
  <td class="align-right ${balanceClass}">${escapeHtml(balance)}</td>
  <td>${escapeHtml(obs)}</td>
</tr>`;
  }).join("");

  const totalWorked = calcs.reduce((acc, c) => acc + (c.workedMinutes ?? 0), 0);
  const totalExpected = calcs.reduce((acc, c) => acc + (c.expectedMinutes ?? 0), 0);
  const totalBalance = calcs.reduce((acc, c) => acc + (c.balanceMinutes ?? 0), 0);
  const totalOvertime = calcs.reduce((acc, c) => acc + (c.overtimeMinutes ?? 0), 0);

  const totalsHtml = `
<tr>
  <td colspan="8"><strong>Totais do mês</strong></td>
  <td class="align-right"><strong>${escapeHtml(minutesToHHMM(totalWorked))}</strong></td>
  <td class="align-right"><strong>${escapeHtml(minutesToHHMM(totalOvertime))}</strong></td>
  <td class="align-right"><strong>${escapeHtml(minutesToHHMM(totalBalance))}</strong></td>
  <td class="muted">Previsto: ${escapeHtml(minutesToHHMM(totalExpected))}</td>
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
    scheduleDaysTable,
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
      margin: { top: "12mm", right: "12mm", bottom: "18mm", left: "12mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-size:9px;padding:0 12mm;color:#374151;display:flex;justify-content:space-between;">
          <div></div>
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
