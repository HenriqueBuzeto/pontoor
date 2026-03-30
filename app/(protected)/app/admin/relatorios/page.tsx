import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listEmployees } from "@/lib/repositories/employees";
import { listTimeEntriesByTenant } from "@/lib/repositories/time-entry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminRelatoriosFiltros } from "./admin-relatorios-filtros";

type Props = { searchParams: Promise<{ employeeId?: string; mes?: string; ano?: string }> };

const ENTRY_LABEL: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_start: "Início intervalo",
  break_end: "Fim intervalo",
  pause_start: "Pausa início",
  pause_end: "Pausa fim",
};

export default async function AdminRelatoriosPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const params = await searchParams;
  const employeeId = params.employeeId ?? "";
  const now = new Date();
  const year = params.ano ? parseInt(params.ano, 10) : now.getFullYear();
  const month = params.mes ? parseInt(params.mes, 10) : now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Relatórios Empresariais</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">Sem acesso ao tenant.</CardContent>
        </Card>
      </div>
    );
  }

  const { list: employees } = await listEmployees(tenantId, { page: 1, status: "active" });
  const entries = await listTimeEntriesByTenant(tenantId, start, end, {
    employeeId: employeeId || undefined,
    limit: 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Relatórios Empresariais</h1>
        <p className="text-ponto-muted">
          Marcações de ponto de todos os colaboradores no período.
        </p>
      </div>

      <AdminRelatoriosFiltros
        employees={employees.map((e) => ({ id: e.id, name: e.name, registration: e.registration }))}
        selectedEmployeeId={employeeId}
        month={month}
        year={year}
      />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">
              Marcações — {String(month).padStart(2, "0")}/{year} ({entries.length} registros)
            </CardTitle>
            {entries.length > 0 && (
              <a
                href={`/app/admin/relatorios/export?mes=${month}&ano=${year}${
                  employeeId ? `&employeeId=${employeeId}` : ""
                }`}
                className="inline-flex items-center rounded-full bg-ponto-orange px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all"
              >
                Exportar Excel
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">Nenhuma marcação no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Colaborador</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Matrícula</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-ponto-border/50">
                      <td className="px-4 py-3 font-medium">{e.employeeName ?? "—"}</td>
                      <td className="px-4 py-3 text-ponto-muted">{e.registration ?? "—"}</td>
                      <td className="px-4 py-3 text-ponto-muted">
                        {new Date(e.occurredAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">{ENTRY_LABEL[e.type] ?? e.type}</td>
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
