import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listDailyCalculationsByTenant } from "@/lib/repositories/time-calculations";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMinutes(m: number) {
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return `${sign}${h}h ${min}min`;
}

type SearchParams = {
  employeeId?: string;
  mes?: string;
  ano?: string;
};

export default async function AdminBancoHorasPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Banco de Horas (Empresa)</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso ao tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;

  const now = new Date();
  const month = resolvedSearchParams?.mes ? Number(resolvedSearchParams.mes) : now.getMonth() + 1;
  const year = resolvedSearchParams?.ano ? Number(resolvedSearchParams.ano) : now.getFullYear();

  const [rows, adjustments] = await Promise.all([
    listDailyCalculationsByTenant(tenantId, year, month, { limit: 20000 }),
    listAdjustments(tenantId, { status: "approved", limit: 5000 }),
  ]);

  // Mapa de faltas justificadas por colaborador e dia
  const justifiedByEmployee = new Map<string, Set<string>>();
  for (const a of adjustments) {
    if (a.type === "justified_absence") {
      const key = a.date.toISOString().slice(0, 10);
      const set = justifiedByEmployee.get(a.employeeId) ?? new Set<string>();
      set.add(key);
      justifiedByEmployee.set(a.employeeId, set);
    }
  }

  // Indexa cálculos diários por colaborador e data (YYYY-MM-DD)
  const byEmployeeByDate = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const r of rows) {
    const rawDate = r.date as unknown;
    const keyDate =
      rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);
    const map = byEmployeeByDate.get(r.employeeId) ?? new Map();
    map.set(keyDate, r);
    byEmployeeByDate.set(r.employeeId, map);
  }

  const byEmployee = new Map<
    string,
    { employeeId: string; employeeName: string | null; registration: string | null; balanceMinutes: number }
  >();

  for (const r of rows) {
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, {
        employeeId: r.employeeId,
        employeeName: r.employeeName ?? null,
        registration: r.registration ?? null,
        balanceMinutes: 0,
      });
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // Reaplica a mesma regra de cálculo de saldo mensal usada na tela de Banco de Horas individual
  for (const [employeeId, summary] of byEmployee.entries()) {
    const byDate = byEmployeeByDate.get(employeeId) ?? new Map();
    const justifiedSet = justifiedByEmployee.get(employeeId) ?? new Set<string>();

    let monthBalance = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const isSunday = currentDate.getDay() === 0;
      if (isSunday) continue;

      const key = currentDate.toISOString().slice(0, 10);
      const calc = byDate.get(key);
      const isJustifiedDay = justifiedSet.has(key);

      const isFutureDay = isCurrentMonth && day > today.getDate();
      const isPastDay =
        currentDate <
        new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday =
        isCurrentMonth &&
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getDate() === today.getDate();

      let dayBalance = 0;

      if (calc) {
        const rawBalance = calc.balanceMinutes ?? 0;
        dayBalance = isJustifiedDay ? 0 : isToday && rawBalance < 0 ? 0 : rawBalance;
      } else {
        const expectedMinutes = 8 * 60;
        const shouldCountAsAbsence =
          isPastDay && !isFutureDay && !isJustifiedDay;
        dayBalance = shouldCountAsAbsence ? -expectedMinutes : 0;
      }

      monthBalance += dayBalance;
    }

    summary.balanceMinutes = monthBalance;
    byEmployee.set(employeeId, summary);
  }

  const allEmployees = Array.from(byEmployee.values()).sort((a, b) => {
    const nameA = (a.employeeName ?? "").toLocaleLowerCase();
    const nameB = (b.employeeName ?? "").toLocaleLowerCase();
    return nameA.localeCompare(nameB, "pt-BR");
  });

  const selectedEmployeeId = resolvedSearchParams?.employeeId ?? "all";
  const filtered =
    selectedEmployeeId === "all"
      ? allEmployees
      : allEmployees.filter((b) => b.employeeId === selectedEmployeeId);

  const totalMinutes = filtered.reduce((acc, b) => acc + b.balanceMinutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Banco de Horas (Empresa)</h1>
        <p className="text-ponto-muted">
          Visão consolidada dos saldos de banco de horas de todos os colaboradores, calculados a partir das jornadas do mês.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3 text-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-ponto-muted">Colaborador</label>
          <select
            name="employeeId"
            defaultValue={selectedEmployeeId}
            className="h-9 min-w-[200px] rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
          >
            <option value="all">Todos</option>
            {allEmployees.map((b) => (
              <option key={b.employeeId} value={b.employeeId}>
                {b.employeeName ?? b.employeeId}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ponto-muted">Mês</label>
          <select
            name="mes"
            defaultValue={String(month)}
            className="h-9 rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ponto-muted">Ano</label>
          <input
            name="ano"
            type="number"
            defaultValue={year}
            className="h-9 w-20 rounded-md border border-ponto-border bg-ponto-white px-2 text-xs"
            min={2020}
            max={2035}
          />
        </div>
        <button
          type="submit"
          className="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-ponto-border bg-ponto-orange px-3 text-xs font-medium text-white hover:bg-ponto-orange/90"
        >
          Aplicar filtro
        </button>
      </form>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-2xl font-bold text-ponto-black">
            Saldo consolidado ({String(month).padStart(2, "0")}/{year}): {formatMinutes(totalMinutes)}
          </p>
          <p className="text-sm text-ponto-muted">
            Soma dos saldos de {filtered.length} colaborador(es) filtrados neste período.
          </p>
        </CardContent>
      </Card>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Saldos por colaborador</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhum saldo de banco de horas calculado para este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Colaborador</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Matrícula</th>
                    <th className="px-4 py-3 text-right font-medium text-ponto-muted">Saldo no mês</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.employeeId} className="border-b border-ponto-border/50 hover:bg-ponto-surface/30">
                      <td className="px-4 py-3 font-medium">{b.employeeName ?? b.employeeId}</td>
                      <td className="px-4 py-3 text-ponto-muted text-xs">{b.registration ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMinutes(b.balanceMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
