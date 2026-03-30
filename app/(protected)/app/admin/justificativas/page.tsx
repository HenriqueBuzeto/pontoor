import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JustificativasAdminList } from "./justificativas-admin-list";

const TYPE_LABEL: Record<string, string> = {
  late: "Atraso",
  absence: "Falta",
  forgot_mark: "Esquecimento",
  early_leave: "Saída antecipada",
  external_work: "Trabalho externo",
  other: "Outro",
};

export default async function AdminJustificativasPage() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Aprovar Justificativas</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso ao tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = await listAdjustments(tenantId, { status: "pending", limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Aprovar Justificativas</h1>
        <p className="text-ponto-muted">
          Aprove ou rejeite solicitações de ajuste. Opcionalmente informe um comentário (ex.: desconto aplicado).
        </p>
      </div>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">
            Pendentes ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhuma justificativa pendente de aprovação.
            </div>
          ) : (
            <JustificativasAdminList
              items={pending.map((a) => ({
                id: a.id,
                employeeName: a.employeeName ?? "—",
                type: TYPE_LABEL[a.type] ?? a.type,
                date: a.date ? new Date(a.date).toLocaleDateString("pt-BR") : "—",
                reason: a.reason,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
