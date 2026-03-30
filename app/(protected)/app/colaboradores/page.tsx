import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listEmployees } from "@/lib/repositories/employees";
import { ColaboradoresFiltros } from "./colaboradores-filtros";

type Props = { searchParams: Promise<{ page?: string; q?: string; status?: string }> };

export default async function ColaboradoresPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.q ?? "";
  const status = params.status ?? "all";

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Colaboradores</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant ou faça login em uma organização.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { list, total, totalPages } = await listEmployees(tenantId, { page, search, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ponto-black">Colaboradores</h1>
          <p className="text-ponto-muted">Cadastro de colaboradores e vínculos</p>
        </div>
        <Button asChild>
          <Link href="/app/colaboradores/novo">
            <Plus className="h-4 w-4" />
            Novo colaborador
          </Link>
        </Button>
      </div>

      <ColaboradoresFiltros q={search} status={status} total={total} />

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Listagem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-ponto-muted">
              Nenhum colaborador encontrado. Cadastre o primeiro em &quot;Novo colaborador&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ponto-border bg-ponto-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Matrícula</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">E-mail</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-ponto-muted">Admissão</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id} className="border-b border-ponto-border/50 hover:bg-ponto-surface/30">
                      <td className="px-4 py-3 font-medium">{e.registration}</td>
                      <td className="px-4 py-3">{e.name}</td>
                      <td className="px-4 py-3 text-ponto-muted">{e.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            e.status === "active"
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                              : "rounded-full bg-ponto-muted/20 px-2 py-0.5 text-xs text-ponto-muted"
                          }
                        >
                          {e.status === "active" ? "Ativo" : e.status === "inactive" ? "Inativo" : "Afastado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ponto-muted">
                        {e.admissionDate ? new Date(e.admissionDate).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-ponto-border px-4 py-3">
              <p className="text-sm text-ponto-muted">
                Página {page} de {totalPages} • {total} registro(s)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link
                      href={`/app/colaboradores?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${status !== "all" ? `&status=${status}` : ""}`}
                    >
                      Anterior
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link
                      href={`/app/colaboradores?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${status !== "all" ? `&status=${status}` : ""}`}
                    >
                      Próxima
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
