import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { listAllBalances } from "@/lib/repositories/hour-bank";
import { listDailyCalculationsByEmployee } from "@/lib/repositories/time-calculations";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { getEmployeeById } from "@/lib/repositories/employees";
import { listEmployees } from "@/lib/repositories/employees";
import { listHolidaysByRange } from "@/lib/repositories/holidays";
import { getNationalHolidaySet } from "@/lib/services/holidays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BancoHorasTabelaAjustes } from "./banco-horas-tabela-ajustes";

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

type SearchParams = {
  month?: string;
  year?: string;
  employeeId?: string;
};

export default async function BancoHorasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const sessionEmployeeId = user?.employeeId ?? null;
  const isAdmin =
    user?.role === "admin" || user?.role === "super_admin";

  const params = await searchParams;
  const selectedEmployeeId = isAdmin ? (params.employeeId ?? "") : "";
  const employeeId = isAdmin
    ? (selectedEmployeeId || sessionEmployeeId)
    : sessionEmployeeId;

  const employee = tenantId && employeeId ? await getEmployeeById(tenantId, employeeId) : null;
  const admissionDateRaw = employee?.admissionDate ?? null;
  const admissionDateKey = admissionDateRaw ? String(admissionDateRaw).slice(0, 10) : null;
  const admissionDate = admissionDateKey ? new Date(`${admissionDateKey}T00:00:00`) : null;
  const now = new Date();
  const selectedMonth = Number(params.month ?? now.getMonth() + 1); // 1-12
  const selectedYear = Number(params.year ?? now.getFullYear());

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Banco de Horas</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const employees = isAdmin
    ? (await listEmployees(tenantId, { page: 1, status: "active" })).list
    : [];

  // Se tiver employeeId, usa os cálculos diários persistidos em time_calculations
  let dailyRows:
    | {
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
      }[]
    | null = null;
  let monthBalanceMinutes = 0;

  if (employeeId) {
    const start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const startKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const endKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
      new Date(selectedYear, selectedMonth, 0).getDate()
    ).padStart(2, "0")}`;

    const [calcRows, approvedAdjustments, manualHolidays, nationalHolidaySet] = await Promise.all([
      listDailyCalculationsByEmployee(
        tenantId,
        employeeId,
        selectedYear,
        selectedMonth
      ),
      listAdjustments(tenantId, {
        status: "approved",
        employeeId,
        limit: 500,
      }),
      listHolidaysByRange(tenantId, startKey, endKey),
      getNationalHolidaySet(selectedYear),
    ]);

    const holidaySet = new Set<string>();
    for (const h of manualHolidays ?? []) {
      const key = String(h.date).slice(0, 10);
      holidaySet.add(key);
    }
    for (const key of nationalHolidaySet) {
      // filtra apenas o mês atual
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
        rawDate instanceof Date
          ? rawDate.toISOString().slice(0, 10)
          : String(rawDate);
      byDayCalc.set(key, r);
    }

    const rawEntries = await listTimeEntriesByEmployee(
      tenantId,
      employeeId,
      start,
      end
    );

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

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      selectedYear === today.getFullYear() &&
      selectedMonth === today.getMonth() + 1;

    const rows: {
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
      const key = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const currentDate = dateFromKey(key);
      const isSunday = currentDate.getDay() === 0;
      if (isSunday) continue;

      const isBeforeAdmission =
        !!admissionDate &&
        currentDate <
          new Date(
            admissionDate.getFullYear(),
            admissionDate.getMonth(),
            admissionDate.getDate()
          );

      const calc = byDayCalc.get(key);
      const bucket = byDayEntries.get(key);
      const isJustifiedDay = justifiedDays.has(key);
      const isHoliday = holidaySet.has(key);

      const isFutureDay = isCurrentMonth && day > today.getDate();

      let workedMinutes = 0;
      let dayBalanceMinutes = 0;

      if (isBeforeAdmission) {
        workedMinutes = 0;
        dayBalanceMinutes = 0;
      } else if (calc) {
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
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
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

      rows.push({
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

    const sortedRows = rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    dailyRows = sortedRows;
    monthBalanceMinutes = sortedRows.reduce((acc, r) => acc + r.dayBalanceMinutes, 0);
  }

  const allBalances = isAdmin && !employeeId ? await listAllBalances(tenantId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ponto-black">Banco de Horas</h1>
        <p className="text-sm text-ponto-muted">
          Acompanhe seu saldo mensal, veja o detalhamento por dia e solicite ajustes quando necessário.
        </p>
      </div>

      {employeeId && (
        <form
          method="get"
          action="/app/banco-horas"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ponto-border bg-ponto-white p-4 shadow-sm"
        >
          {isAdmin && (
            <div className="min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-ponto-muted">Colaborador</label>
              <select
                name="employeeId"
                defaultValue={selectedEmployeeId || ""}
                className="h-9 w-full rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
              >
                <option value="">Meu usuário</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.registration})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ponto-muted">Mês</label>
            <select
              name="month"
              defaultValue={String(selectedMonth)}
              className="h-9 rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
            >
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ponto-muted">Ano</label>
            <input
              name="year"
              defaultValue={String(selectedYear)}
              className="h-9 w-20 rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
            />
          </div>
          <button
            type="submit"
            className="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-ponto-border bg-ponto-orange px-3 text-xs font-medium text-white hover:bg-ponto-orange/90"
          >
            Filtrar
          </button>
        </form>
      )}

      {employeeId && dailyRows && (
        <>
            <Card className="border-ponto-border-soft bg-white/95 shadow-lux backdrop-blur">
            <CardHeader className="border-b border-ponto-border/40 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-ponto-black">
                    Resumo do mês
                  </CardTitle>
                  <p className="text-xs text-ponto-muted">
                    Saldo considerando a jornada padrão de 8h por dia útil.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/app/banco-horas/export?month=${selectedMonth}&year=${selectedYear}${
                      isAdmin && selectedEmployeeId ? `&employeeId=${encodeURIComponent(selectedEmployeeId)}` : ""
                    }&format=html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-ponto-border bg-ponto-surface px-3 py-1.5 text-xs font-medium text-ponto-black hover:bg-ponto-border/20"
                  >
                    Imprimir / PDF
                  </a>
                  <a
                    href={`/app/banco-horas/export?month=${selectedMonth}&year=${selectedYear}${
                      isAdmin && selectedEmployeeId ? `&employeeId=${encodeURIComponent(selectedEmployeeId)}` : ""
                    }`}
                    className="inline-flex items-center rounded-full bg-ponto-orange px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all"
                  >
                    Exportar Excel
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-3xl font-bold text-ponto-black">
                  {formatMinutes(monthBalanceMinutes)}
                </p>
                <p className="mt-1 text-xs text-ponto-muted">
                  {dailyRows.length} dia(s) com marcação no mês selecionado. Ajustes aprovados do mês já considerados nas marcações do dia.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-xs text-ponto-muted">
                <p>
                  • Valores **positivos** indicam horas a favor do colaborador (crédito).
                </p>
                <p>
                  • Valores **negativos** indicam horas a compensar (débito).
                </p>
                <p>
                  Use o botão <span className="font-semibold text-ponto-black">“Ajuste de ponto”</span>{" "}
                  em cada dia para solicitar correções específicas.
                </p>
              </div>
            </CardContent>
          </Card>

            <Card className="border-ponto-border-soft bg-white/95 shadow-lux backdrop-blur">
            <CardHeader className="border-b border-ponto-border/40 pb-3">
              <CardTitle className="text-base font-semibold text-ponto-black">
                Detalhamento por dia ({dailyRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BancoHorasTabelaAjustes
                rows={dailyRows.map((r) => ({
                  date: dateKeySP(r.date),
                  displayDate: r.date.toLocaleDateString("pt-BR", { timeZone: TZ }),
                  entry: r.firstIn
                    ? r.firstIn.toLocaleTimeString("pt-BR", {
                        timeZone: TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  exit: r.lastOut
                    ? r.lastOut.toLocaleTimeString("pt-BR", {
                        timeZone: TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  lunchStart: r.lunchStart
                    ? r.lunchStart.toLocaleTimeString("pt-BR", {
                        timeZone: TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  lunchEnd: r.lunchEnd
                    ? r.lunchEnd.toLocaleTimeString("pt-BR", {
                        timeZone: TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  extraStart:
                    r.extraStart && r.extraEnd
                      ? r.extraStart.toLocaleTimeString("pt-BR", {
                          timeZone: TZ,
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null,
                  extraEnd:
                    r.extraStart && r.extraEnd
                      ? r.extraEnd.toLocaleTimeString("pt-BR", {
                          timeZone: TZ,
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null,
                  workedLabel: formatMinutes(r.workedMinutes),
                  dayBalanceLabel: formatMinutes(r.dayBalanceMinutes),
                  justifiedLabel: r.justified
                    ? "Falta justificada / atestado"
                    : null,
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}

      {isAdmin && allBalances.length > 0 && (
        <Card className="border-ponto-border shadow-lux">
          <CardHeader className="border-b border-ponto-border/50">
            <CardTitle className="text-base">Saldos por colaborador</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Colaborador</th>
                    <th className="px-4 py-3 text-right font-medium text-ponto-muted">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {allBalances.map((b) => (
                    <tr key={b.employeeId} className="border-b border-ponto-border/50">
                      <td className="px-4 py-3 font-medium">{b.employeeName ?? b.employeeId}</td>
                      <td className="px-4 py-3 text-right">{formatMinutes(b.balanceMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && !employeeId && allBalances.length === 0 && !dailyRows && (
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Nenhum saldo de banco de horas cadastrado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
