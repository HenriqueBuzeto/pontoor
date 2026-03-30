import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { listEmployees } from "@/lib/repositories/employees";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EspelhoFiltros } from "./espelho-filtros";
import { EspelhoTabelaAjustes } from "./espelho-tabela-ajustes";

type Props = { searchParams: Promise<{ employeeId?: string; month?: string; year?: string }> };

export default async function EspelhoPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const currentEmployeeId = user?.employeeId ?? null;
  const isAdmin =
    user?.role === "admin" || user?.role === "super_admin";

  const params = await searchParams;
  const requestedEmployeeId = params.employeeId ?? "";
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Espelho de Ponto</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { list: allEmployees } = await listEmployees(tenantId, { page: 1, status: "active" });

  // Colaborador comum só pode ver o próprio espelho;
  // admin/super_admin podem escolher qualquer colaborador.
  const effectiveEmployeeId =
    isAdmin && requestedEmployeeId
      ? requestedEmployeeId
      : currentEmployeeId && !isAdmin
      ? currentEmployeeId
      : requestedEmployeeId || currentEmployeeId || "";

  const employees = isAdmin
    ? allEmployees
    : allEmployees.filter((e) => e.id === currentEmployeeId);

  const rawEntries =
    effectiveEmployeeId && /^[0-9a-f-]{36}$/i.test(effectiveEmployeeId)
      ? await listTimeEntriesByEmployee(tenantId, effectiveEmployeeId, start, end)
      : [];

  // Constrói uma visão consolidada por dia (usando mesma lógica do Banco de Horas),
  // gerando apenas os horários finais que realmente contam para o cálculo.
  type LocalEntry = { time: Date; type: string };

  const byDay = new Map<string, { date: Date; items: LocalEntry[] }>();
  for (const e of rawEntries) {
    const d = new Date(e.occurredAt);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const bucket =
      byDay.get(key) ?? {
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        items: [] as LocalEntry[],
      };
    bucket.items.push({ time: d, type: e.type });
    byDay.set(key, bucket);
  }

  const consolidatedEntries: { id: string; occurredAt: string; type: string }[] = [];

  for (const [key, bucket] of byDay.entries()) {
    const sorted = bucket.items.sort((a, b) => a.time.getTime() - b.time.getTime());

    let firstIn: Date | null = null;
    let lastOut: Date | null = null;
    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    let extraStart: Date | null = null;
    let extraEnd: Date | null = null;

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

    // Gera apenas as marcações consolidadas que realmente contam
    if (firstIn) {
      consolidatedEntries.push({
        id: `${key}-clock_in`,
        occurredAt: firstIn.toISOString(),
        type: "clock_in",
      });
    }
    if (lunchStart) {
      consolidatedEntries.push({
        id: `${key}-break_start`,
        occurredAt: lunchStart.toISOString(),
        type: "break_start",
      });
    }
    if (lunchEnd) {
      consolidatedEntries.push({
        id: `${key}-break_end`,
        occurredAt: lunchEnd.toISOString(),
        type: "break_end",
      });
    }
    if (lastOut) {
      consolidatedEntries.push({
        id: `${key}-clock_out`,
        occurredAt: lastOut.toISOString(),
        type: "clock_out",
      });
    }
    if (extraStart) {
      consolidatedEntries.push({
        id: `${key}-extra_start`,
        occurredAt: extraStart.toISOString(),
        type: "clock_in",
      });
    }
    if (extraEnd) {
      consolidatedEntries.push({
        id: `${key}-extra_end`,
        occurredAt: extraEnd.toISOString(),
        type: "clock_out",
      });
    }
  }

  const selectedEmployee = employees.find((e) => e.id === effectiveEmployeeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Espelho de Ponto</h1>
        <p className="text-ponto-muted">Visão mensal, marcações e exportação PDF</p>
      </div>

      <EspelhoFiltros
        employees={employees.map((e) => ({ id: e.id, name: e.name, registration: e.registration }))}
        selectedEmployeeId={effectiveEmployeeId}
        month={month}
        year={year}
      />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">
            {selectedEmployee
              ? `Marcações — ${selectedEmployee.name} (${selectedEmployee.registration}) — ${String(month).padStart(2, "0")}/${year}`
              : "Selecione um colaborador e período"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!effectiveEmployeeId ? (
            <div className="p-8 text-center text-ponto-muted">
              Selecione um colaborador acima para visualizar o espelho de ponto.
            </div>
          ) : consolidatedEntries.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhuma marcação no período.
            </div>
          ) : (
            <EspelhoTabelaAjustes
              entries={consolidatedEntries}
            />
          )}
          {effectiveEmployeeId && consolidatedEntries.length > 0 && (
            <div className="border-t border-ponto-border px-4 py-3 flex items-center justify-between text-sm">
              <p className="text-ponto-muted">Exporte o espelho para conferência ou envio ao RH.</p>
              <a
                href={`/app/espelho/export?employeeId=${effectiveEmployeeId}&month=${month}&year=${year}`}
                className="inline-flex items-center rounded-full bg-ponto-orange px-4 py-1.5 text-xs font-medium text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all"
              >
                Exportar Excel
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
