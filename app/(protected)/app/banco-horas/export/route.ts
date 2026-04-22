import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/session";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getSessionUserIdFromRequest } from "@/lib/auth/session-cookie";
import { listDailyCalculationsByEmployee } from "@/lib/repositories/time-calculations";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { listHolidaysByRange } from "@/lib/repositories/holidays";
import { getNationalHolidaySet } from "@/lib/services/holidays";

function formatMinutes(m: number) {
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return `${sign}${h}h ${min}min`;
}

const TZ = "America/Sao_Paulo";

function dateKeySP(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

export async function GET(req: NextRequest) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return new Response("Sem tenant.", { status: 401 });

  const userId = await getSessionUserIdFromRequest(req);
  const user = userId ? await getSessionUser(userId) : null;
  if (!user?.employeeId) return new Response("Usuário sem colaborador.", { status: 400 });

  const isAdmin = user.role === "admin" || user.role === "super_admin";

  const search = req.nextUrl.searchParams;
  const month = Number(search.get("month") ?? "0");
  const year = Number(search.get("year") ?? "0");
  const formatParam = (search.get("format") ?? "csv").toLowerCase();
  const requestedEmployeeId = (search.get("employeeId") ?? "").trim();
  if (!month || !year) return new Response("Parâmetros inválidos.", { status: 400 });

  const employeeId = isAdmin ? (requestedEmployeeId || user.employeeId) : user.employeeId;

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const endKey = `${year}-${String(month).padStart(2, "0")}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  const [calcRows, approvedAdjustments, rawEntries, manualHolidays, nationalHolidaySet] = await Promise.all([
    listDailyCalculationsByEmployee(tenantId, employeeId, year, month),
    listAdjustments(tenantId, {
      status: "approved",
      employeeId,
      limit: 500,
    }),
    listTimeEntriesByEmployee(tenantId, employeeId, start, end),
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

  const justifiedDays = new Set<string>();
  for (const a of approvedAdjustments) {
    if (a.type === "justified_absence") {
      justifiedDays.add(a.date.toISOString().slice(0, 10));
    }
  }

  const byDayCalc = new Map<string, (typeof calcRows)[number]>();
  for (const r of calcRows ?? []) {
    const rawDate = r.date as unknown;
    const key =
      rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);
    byDayCalc.set(key, r);
  }

  type LocalEntry = { time: Date; type: string };
  const byDayEntries = new Map<string, { date: Date; items: LocalEntry[] }>();
  for (const e of rawEntries) {
    const d = new Date(e.occurredAt);
    const key = dateKeySP(d);
    const bucket =
      byDayEntries.get(key) ?? {
        date: dateFromKey(key),
        items: [] as LocalEntry[],
      };
    bucket.items.push({ time: d, type: e.type });
    byDayEntries.set(key, bucket);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const dailyRows: {
    date: Date;
    firstIn: Date | null;
    lastOut: Date | null;
    lunchStart: Date | null;
    lunchEnd: Date | null;
    extraStart: Date | null;
    extraEnd: Date | null;
    workedMinutes: number;
    dayBalanceMinutes: number;
    justified: boolean;
  }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const currentDate = dateFromKey(key);
    const isSunday = currentDate.getDay() === 0;
    if (isSunday) continue;

    const calc = byDayCalc.get(key);
    const bucket = byDayEntries.get(key);
    const isJustifiedDay = justifiedDays.has(key);
    const isHoliday = holidaySet.has(key);

    const isFutureDay = isCurrentMonth && day > today.getDate();

    let workedMinutes = 0;
    let dayBalanceMinutes = 0;

    if (calc) {
      workedMinutes = calc.workedMinutes ?? 0;
      const rawBalance = calc.balanceMinutes ?? 0;
      const isToday =
        isCurrentMonth &&
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getDate() === today.getDate();

      dayBalanceMinutes = isJustifiedDay
        ? 0
        : isHoliday && workedMinutes === 0
        ? 0
        : isToday && rawBalance < 0
        ? 0
        : rawBalance;
    } else {
      const expectedMinutes = isHoliday ? 0 : 8 * 60;
      const isPastDay =
        currentDate <
        new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const shouldCountAsAbsence =
        isPastDay && !isFutureDay && !isJustifiedDay && expectedMinutes > 0;
      workedMinutes = 0;
      dayBalanceMinutes = shouldCountAsAbsence ? -expectedMinutes : 0;
    }

    let firstIn: Date | null = null;
    let lastOut: Date | null = null;
    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    let extraStart: Date | null = null;
    let extraEnd: Date | null = null;

    if (bucket) {
      const sorted = bucket.items.sort(
        (a, b) => a.time.getTime() - b.time.getTime()
      );

      for (const item of sorted) {
        const { time, type } = item;

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
    }

    dailyRows.push({
      date: currentDate,
      firstIn,
      lastOut,
      lunchStart,
      lunchEnd,
      extraStart,
      extraEnd,
      workedMinutes,
      dayBalanceMinutes,
      justified: isJustifiedDay,
    });
  }

  dailyRows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatTime = (d: Date | null) =>
    d
      ? d.toLocaleTimeString("pt-BR", {
          timeZone: TZ,
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  if (formatParam === "html") {
    const periodLabel = `${String(month).padStart(2, "0")}/${year}`;
    const headerHtml = `<header style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:18px;font-weight:600;color:#111827;">Banco de Horas</div>
    <div style="font-size:12px;color:#6b7280;">Período: ${periodLabel}</div>
  </div>
  <div style="font-size:11px;color:#9ca3af;">Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: TZ })}</div>
</header>`;

    const bodyRows = dailyRows
      .map((r) => {
        const data = r.date.toLocaleDateString("pt-BR", { timeZone: TZ });
        return `<tr>
  <td>${data}</td>
  <td>${formatTime(r.firstIn)}</td>
  <td>${formatTime(r.lastOut)}</td>
  <td>${formatTime(r.lunchStart)}</td>
  <td>${formatTime(r.lunchEnd)}</td>
  <td>${formatTime(r.extraStart && r.extraEnd ? r.extraStart : null)}</td>
  <td>${formatTime(r.extraStart && r.extraEnd ? r.extraEnd : null)}</td>
  <td>${formatMinutes(r.workedMinutes)}</td>
  <td>${formatMinutes(r.dayBalanceMinutes)}</td>
</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>Banco de Horas</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f3f4f6; color:#111827; margin:0; padding:24px; }
    .container { max-width: 960px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,0.12); overflow:hidden; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead { background:#f3f4f6; }
    th, td { padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    <main style="padding:16px 24px 20px 24px;">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Início almoço</th>
            <th>Fim almoço</th>
            <th>Início extra</th>
            <th>Fim extra</th>
            <th>Horas trabalhadas</th>
            <th>Saldo do dia</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </main>
  </div>
</body>
</html>`;

    const fileNameHtml = `banco-horas-${String(month).padStart(2, "0")}-${year}.html`;
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileNameHtml}"`,
      },
    });
  }

  const header = [
    "Data",
    "Entrada",
    "Saída",
    "Início almoço",
    "Fim almoço",
    "Início extra",
    "Fim extra",
    "Horas trabalhadas",
    "Saldo do dia",
  ].join(";");

  const rowsCsv = dailyRows.map((r) => {
    const data = r.date.toLocaleDateString("pt-BR", { timeZone: TZ });
    const entrada = formatTime(r.firstIn);
    const saida = formatTime(r.lastOut);
    const almocoInicio = formatTime(r.lunchStart);
    const almocoFim = formatTime(r.lunchEnd);
    const extraInicio = formatTime(r.extraStart && r.extraEnd ? r.extraStart : null);
    const extraFim = formatTime(r.extraStart && r.extraEnd ? r.extraEnd : null);
    return [
      data,
      entrada,
      saida,
      almocoInicio,
      almocoFim,
      extraInicio,
      extraFim,
      formatMinutes(r.workedMinutes),
      formatMinutes(r.dayBalanceMinutes),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";");
  });

  const csv = [header, ...rowsCsv].join("\r\n");
  const fileName = `banco-horas-${String(month).padStart(2, "0")}-${year}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
