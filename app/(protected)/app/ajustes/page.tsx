import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { getCurrentUser } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AjustesFiltros } from "./ajustes-filtros";
import { AjustesForm } from "./ajustes-form";

type AdjustmentStatus = "pending" | "approved" | "rejected" | "all";

type Props = { searchParams: Promise<{ status?: AdjustmentStatus }> };

const TYPE_LABEL: Record<string, string> = {
  late: "Atraso",
  absence: "Falta (não justificada)",
  justified_absence: "Falta justificada / atestado (não contar horas)",
  forgot_mark: "Esquecimento",
  early_leave: "Saída antecipada",
  external_work: "Trabalho externo",
  other: "Outro",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export default async function AjustesPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const employeeId = user?.employeeId ?? null;
  const isAdmin =
    user?.role === "admin" || user?.role === "super_admin";
  const params = await searchParams;
  const status: AdjustmentStatus = params.status ?? "all";

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Ajustes e Justificativas</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const list = await listAdjustments(tenantId, {
    status,
    // colaborador vê apenas os próprios ajustes; admins podem ver todos
    employeeId: isAdmin ? undefined : employeeId ?? undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Ajustes e Justificativas</h1>
        <p className="text-ponto-muted">Solicitações de ajuste e fluxo de aprovação</p>
      </div>

      {employeeId && (
        <AjustesForm />
      )}

      <AjustesFiltros status={status} />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Solicitações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhuma solicitação de ajuste encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Colaborador</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Motivo</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} className="border-b border-ponto-border/50 hover:bg-ponto-surface/30">
                      <td className="px-4 py-3 font-medium">{a.employeeName ?? "—"}</td>
                      <td className="px-4 py-3">{TYPE_LABEL[a.type] ?? a.type}</td>
                      <td className="px-4 py-3 text-ponto-muted">
                        {a.date ? new Date(a.date).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-ponto-muted" title={a.reason}>
                        {a.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            a.status === "approved"
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                              : a.status === "rejected"
                                ? "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800"
                                : "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                          }
                        >
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
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
