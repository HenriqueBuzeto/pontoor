import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { isAdmin } from "@/lib/auth/is-admin";
import { listHolidaysByRange } from "@/lib/repositories/holidays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeriadosAdminClient } from "./page-client";

type Props = { searchParams: Promise<{ year?: string }> };

export default async function FeriadosAdminPage({ searchParams }: Props) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem tenant.</CardContent>
      </Card>
    );
  }

  const ok = await isAdmin();
  if (!ok) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem permissão.</CardContent>
      </Card>
    );
  }

  const params = await searchParams;
  const year = Number(params.year ?? new Date().getFullYear());
  const startKey = `${year}-01-01`;
  const endKey = `${year}-12-31`;

  const list = await listHolidaysByRange(tenantId, startKey, endKey);
  const holidays = (list ?? []).map((h) => ({ date: String(h.date).slice(0, 10), name: h.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Feriados</h1>
        <p className="text-ponto-muted">Cadastro de feriados municipais por empresa</p>
      </div>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle className="text-base">Feriados cadastrados ({year})</CardTitle>
        </CardHeader>
        <CardContent>
          <FeriadosAdminClient initialYear={year} holidays={holidays} />
        </CardContent>
      </Card>
    </div>
  );
}
