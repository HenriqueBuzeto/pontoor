import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatoriosFiltros } from "./relatorios-filtros";
import { listTimeEntriesByTenant } from "@/lib/repositories/time-entry";
import { listDailyCalculationsByTenant } from "@/lib/repositories/time-calculations";
import { listEmployees } from "@/lib/repositories/employees";

type Props = { searchParams: Promise<{ tipo?: string; mes?: string; ano?: string; employeeId?: string }> };

export default async function RelatoriosPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const params = await searchParams;
  const tipo = params.tipo ?? "";
  const mesParam = params.mes ?? "";
  const anoParam = params.ano ?? "";
  const employeeIdParam = params.employeeId ?? "";

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Relatórios</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFilters = !!(tipo || mesParam || anoParam || employeeIdParam);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const employeeId = isAdmin ? employeeIdParam : "";

  const employees = isAdmin
    ? (await listEmployees(tenantId, { page: 1, status: "active" })).list
    : [];

  let content: React.ReactNode = (
    <p className="text-ponto-muted">
      Selecione o tipo de relatório e o período para gerar. Tipos disponíveis: Espelho de ponto, Marcações, Atrasos, Horas
      extras.
    </p>
  );

  let periodoLabel: string | null = null;

  if (hasFilters) {
    const now = new Date();
    const mes = mesParam ? Number(mesParam) : now.getMonth() + 1;
    const ano = anoParam ? Number(anoParam) : now.getFullYear();

    const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    const end = new Date(ano, mes, 0, 23, 59, 59, 999);

    periodoLabel = `${format(start, "MMM yyyy", { locale: ptBR })}`;

    if (tipo === "marcacoes") {
      const rows = await listTimeEntriesByTenant(tenantId, start, end, {
        limit: 2000,
        employeeId: employeeId || undefined,
      });
      const hasData = rows.length > 0;

      if (!hasData) {
        content = (
          <p className="text-ponto-muted">
            Nenhuma marcação encontrada para o período selecionado. Ajuste os filtros ou tente outro mês.
          </p>
        );
      } else {
        const uniqueEmployees = new Set(rows.map((r) => r.employeeId));

        content = (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Período</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{periodoLabel}</div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Marcações</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{rows.length}</div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Colaboradores</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{uniqueEmployees.size}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ponto-border">
              <table className="min-w-full divide-y divide-ponto-border/60 text-sm">
                <thead className="bg-ponto-surface-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Data
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Hora
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Colaborador
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Matrícula
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Tipo
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ponto-muted">
                      Origem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ponto-border/40 bg-ponto-white">
                  {rows.map((r) => {
                    const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
                    const data = format(occurred, "dd/MM/yyyy", { locale: ptBR });
                    const hora = format(occurred, "HH:mm", { locale: ptBR });

                    const tipoLabelMap: Record<string, string> = {
                      clock_in: "Entrada",
                      clock_out: "Saída",
                      break_start: "Saída almoço",
                      break_end: "Retorno almoço",
                    };

                    const tipoLabel = tipoLabelMap[r.type] ?? r.type;

                    return (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-ponto-muted">{data}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-ponto-black">{hora}</td>
                        <td className="px-3 py-2 text-xs text-ponto-black">
                          {r.employeeName ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-ponto-muted">
                          {r.registration ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-ponto-muted">{tipoLabel}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-ponto-muted">
                          {r.source === "manual_adjustment" ? "Ajuste manual" : r.source ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    } else if (tipo === "espelho") {
      const rows = await listTimeEntriesByTenant(tenantId, start, end, {
        limit: 5000,
        employeeId: employeeId || undefined,
      });
      const hasData = rows.length > 0;

      if (!hasData) {
        content = (
          <p className="text-ponto-muted">
            Nenhuma marcação encontrada para o período selecionado. Ajuste os filtros ou tente outro mês.
          </p>
        );
      } else {
        type DayBucket = {
          date: Date;
          items: typeof rows;
        };

        const byEmployee = new Map<
          string,
          {
            employeeName: string | null;
            registration: string | null;
            days: Map<string, DayBucket>;
          }
        >();

        for (const r of rows) {
          const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
          const keyDate = occurred.toISOString().slice(0, 10);

          if (!byEmployee.has(r.employeeId)) {
            byEmployee.set(r.employeeId, {
              employeeName: r.employeeName ?? null,
              registration: r.registration ?? null,
              days: new Map(),
            });
          }

          const emp = byEmployee.get(r.employeeId)!;
          if (!emp.days.has(keyDate)) {
            emp.days.set(keyDate, { date: occurred, items: [] as typeof rows });
          }

          const bucket = emp.days.get(keyDate)!;
          bucket.items.push(r);
        }

        const employeesArray = Array.from(byEmployee.entries()).sort(([, a], [, b]) => {
          const nameA = (a.employeeName ?? "").toLocaleLowerCase();
          const nameB = (b.employeeName ?? "").toLocaleLowerCase();
          if (nameA && nameB) return nameA.localeCompare(nameB, "pt-BR");
          return 0;
        });

        content = (
          <div className="space-y-6">
            {employeesArray.map(([employeeId, emp]) => {
              const daysArray = Array.from(emp.days.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

              return (
                <Card key={employeeId} className="border border-ponto-border/70 shadow-sm">
                  <CardHeader className="border-b border-ponto-border/60 bg-ponto-surface">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ponto-black">
                          {emp.employeeName ?? "Colaborador sem nome"}
                        </p>
                        <p className="text-xs text-ponto-muted">
                          Matrícula: <span className="font-medium">{emp.registration ?? "—"}</span>
                        </p>
                      </div>
                      <p className="text-xs text-ponto-muted">
                        Espelho de ponto • <span className="font-medium">{periodoLabel}</span>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-ponto-border/60 text-xs">
                        <thead className="bg-ponto-surface-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Dia
                            </th>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Entrada
                            </th>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Saída almoço
                            </th>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Retorno almoço
                            </th>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Saída
                            </th>
                            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                              Qtde marcações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ponto-border/40 bg-ponto-white">
                          {daysArray.map((d) => {
                            const sorted = [...d.items].sort((a, b) => {
                              const da =
                                a.occurredAt instanceof Date
                                  ? a.occurredAt
                                  : new Date(a.occurredAt as unknown as string);
                              const db =
                                b.occurredAt instanceof Date
                                  ? b.occurredAt
                                  : new Date(b.occurredAt as unknown as string);
                              return da.getTime() - db.getTime();
                            });

                            let entrada: Date | null = null;
                            let saidaAlmoco: Date | null = null;
                            let retornoAlmoco: Date | null = null;
                            let saida: Date | null = null;

                            for (const r of sorted) {
                              const occurred =
                                r.occurredAt instanceof Date
                                  ? r.occurredAt
                                  : new Date(r.occurredAt as unknown as string);
                              if (r.type === "clock_in" && !entrada) entrada = occurred;
                              if (r.type === "break_start" && !saidaAlmoco) saidaAlmoco = occurred;
                              if (r.type === "break_end" && !retornoAlmoco) retornoAlmoco = occurred;
                              if (r.type === "clock_out") saida = occurred;
                            }

                            const diaLabel = format(d.date, "dd/MM", { locale: ptBR });
                            const fmt = (value: Date | null) =>
                              value ? format(value, "HH:mm", { locale: ptBR }) : "—";

                            return (
                              <tr key={d.date.toISOString()}>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">
                                  {diaLabel}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                                  {fmt(entrada)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                                  {fmt(saidaAlmoco)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                                  {fmt(retornoAlmoco)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                                  {fmt(saida)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">
                                  {sorted.length}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      }
    } else if (tipo === "atrasos") {
      const calcRows = await listDailyCalculationsByTenant(tenantId, ano, mes, {
        limit: 5000,
        employeeId: employeeId || undefined,
      });
      const rows = calcRows.filter(
        (r) => (r.lateMinutes ?? 0) > 0 || (r.earlyLeaveMinutes ?? 0) > 0
      );
      const hasData = rows.length > 0;

      if (!hasData) {
        content = (
          <p className="text-ponto-muted">
            Nenhum dia com atraso encontrado para o período selecionado. Ajuste os filtros ou tente outro mês.
          </p>
        );
      } else {
        const totalLate = rows.reduce((acc, r) => acc + (r.lateMinutes ?? 0), 0);
        const totalEarly = rows.reduce((acc, r) => acc + (r.earlyLeaveMinutes ?? 0), 0);
        const uniqueEmployees = new Set(rows.map((r) => r.employeeId));

        const formatMinutes = (minutes: number) => {
          const abs = Math.abs(minutes);
          const h = Math.floor(abs / 60);
          const m = abs % 60;
          if (!h && !m) return "0 min";
          if (!h) return `${m} min`;
          if (!m) return `${h} h`;
          return `${h} h ${m} min`;
        };

        content = (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Período</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{periodoLabel}</div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Total de atrasos</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">
                  {formatMinutes(totalLate + totalEarly)}
                </div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">
                  Colaboradores com atrasos
                </div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{uniqueEmployees.size}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ponto-border">
              <table className="min-w-full divide-y divide-ponto-border/60 text-xs">
                <thead className="bg-ponto-surface-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Data
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Colaborador
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Matrícula
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Atraso entrada
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Saída antecipada
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Total atraso
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ponto-border/40 bg-ponto-white">
                  {rows.map((r) => {
                    const rawDate = r.date as unknown;
                    const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
                    const dataLabel = format(dt, "dd/MM/yyyy", { locale: ptBR });
                    const late = r.lateMinutes ?? 0;
                    const early = r.earlyLeaveMinutes ?? 0;
                    const total = late + early;

                    return (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">{dataLabel}</td>
                        <td className="px-3 py-2 text-[11px] text-ponto-black">
                          {r.employeeName ?? "Colaborador"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">
                          {r.registration ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                          {formatMinutes(late)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                          {formatMinutes(early)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                          {formatMinutes(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    } else if (tipo === "horas_extras") {
      const calcRows = await listDailyCalculationsByTenant(tenantId, ano, mes, {
        limit: 5000,
        employeeId: employeeId || undefined,
      });
      const rows = calcRows.filter((r) => (r.overtimeMinutes ?? 0) > 0);
      const hasData = rows.length > 0;

      if (!hasData) {
        content = (
          <p className="text-ponto-muted">
            Nenhum dia com horas extras encontrado para o período selecionado. Ajuste os filtros ou tente outro mês.
          </p>
        );
      } else {
        const totalOvertime = rows.reduce((acc, r) => acc + (r.overtimeMinutes ?? 0), 0);
        const uniqueEmployees = new Set(rows.map((r) => r.employeeId));

        const formatMinutes = (minutes: number) => {
          const abs = Math.abs(minutes);
          const h = Math.floor(abs / 60);
          const m = abs % 60;
          if (!h && !m) return "0 min";
          if (!h) return `${m} min`;
          if (!m) return `${h} h`;
          return `${h} h ${m} min`;
        };

        content = (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">Período</div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{periodoLabel}</div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">
                  Total de horas extras
                </div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">
                  {formatMinutes(totalOvertime)}
                </div>
              </div>
              <div className="rounded-lg border border-ponto-border bg-ponto-surface px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-ponto-muted">
                  Colaboradores com extra
                </div>
                <div className="mt-1 text-sm font-semibold text-ponto-black">{uniqueEmployees.size}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ponto-border">
              <table className="min-w-full divide-y divide-ponto-border/60 text-xs">
                <thead className="bg-ponto-surface-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Data
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Colaborador
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Matrícula
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Horas extras
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-ponto-muted">
                      Saldo do dia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ponto-border/40 bg-ponto-white">
                  {rows.map((r) => {
                    const rawDate = r.date as unknown;
                    const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
                    const dataLabel = format(dt, "dd/MM/yyyy", { locale: ptBR });
                    const overtime = r.overtimeMinutes ?? 0;
                    const balance = r.balanceMinutes ?? 0;

                    return (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">{dataLabel}</td>
                        <td className="px-3 py-2 text-[11px] text-ponto-black">
                          {r.employeeName ?? "Colaborador"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-muted">
                          {r.registration ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                          {formatMinutes(overtime)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-ponto-black">
                          {formatMinutes(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    } else {
      content = (
        <p className="text-ponto-muted">
          Este tipo de relatório ainda está em implementação. No momento, os tipos totalmente funcionais são{" "}
          <span className="font-semibold">Marcações, Espelho de ponto, Atrasos e Horas extras</span>.
        </p>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Relatórios</h1>
        <p className="text-ponto-muted">Relatórios gerenciais e exportação PDF/CSV/XLSX</p>
      </div>

      <RelatoriosFiltros
        tipo={tipo}
        mes={mesParam}
        ano={anoParam}
        employeeId={employeeIdParam}
        employees={employees.map((e) => ({ id: e.id, name: e.name, registration: e.registration }))}
        showEmployeeSelect={!!isAdmin}
      />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="flex items-center justify-between border-b border-ponto-border/50">
          <div>
            <CardTitle className="text-base">Resultado</CardTitle>
            {periodoLabel && (
              <p className="mt-1 text-xs text-ponto-muted">
                Período: <span className="font-medium text-ponto-black">{periodoLabel}</span>
              </p>
            )}
          </div>
          {hasFilters && tipo && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`/app/relatorios/export?tipo=${encodeURIComponent(tipo)}&mes=${encodeURIComponent(
                  mesParam || ""
                )}&ano=${encodeURIComponent(anoParam || "")}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}&formato=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-ponto-border bg-ponto-surface px-3 py-1.5 text-xs font-medium text-ponto-black hover:bg-ponto-border/20"
              >
                Imprimir / PDF
              </a>
              <a
                href={`/app/relatorios/export?tipo=${encodeURIComponent(tipo)}&mes=${encodeURIComponent(
                  mesParam || ""
                )}&ano=${encodeURIComponent(anoParam || "")}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}&formato=csv`}
                className="inline-flex items-center rounded-md border border-ponto-border bg-ponto-surface px-3 py-1.5 text-xs font-medium text-ponto-black hover:bg-ponto-border/20"
              >
                Exportar Excel/CSV
              </a>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    </div>
  );
}
