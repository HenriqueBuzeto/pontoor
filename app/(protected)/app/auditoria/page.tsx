import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listAuditLogs } from "@/lib/repositories/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditoriaFiltros } from "./auditoria-filtros";

type Props = { searchParams: Promise<{ entity?: string }> };

export default async function AuditoriaPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const params = await searchParams;
  const entity = params.entity ?? "";

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Auditoria</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const list = await listAuditLogs(tenantId, { entity: entity || undefined, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Auditoria</h1>
        <p className="text-ponto-muted">Logs e trilha de auditoria (somente leitura)</p>
      </div>

      <AuditoriaFiltros entity={entity} />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhum registro de auditoria no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Usuário</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Ação</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Entidade</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">IP</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const userLabel = a.authId || a.userId || "—";
                    const meta =
                      (a.metadata && Object.keys(a.metadata).length > 0 && JSON.stringify(a.metadata)) ||
                      (a.after && Object.keys(a.after).length > 0 && JSON.stringify(a.after)) ||
                      (a.before && Object.keys(a.before).length > 0 && JSON.stringify(a.before)) ||
                      "";
                    const metaShort = meta.length > 80 ? `${meta.slice(0, 80)}…` : meta;

                    return (
                      <tr key={a.id} className="border-b border-ponto-border/50 hover:bg-ponto-surface/30">
                        <td className="px-4 py-3 text-ponto-muted">
                          {new Date(a.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-ponto-black text-xs">{userLabel}</td>
                        <td className="px-4 py-3 font-medium">{a.action}</td>
                        <td className="px-4 py-3 text-xs text-ponto-muted">
                          {a.entity}
                          {a.entityId ? ` • ${a.entityId}` : ""}
                        </td>
                        <td className="px-4 py-3 text-ponto-muted text-xs">{a.ipAddress ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-ponto-muted">
                          {metaShort || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
