import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { listVacationsByEmployee } from "@/lib/repositories/vacations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeriasClient } from "./page-client";

export default async function FeriasPage() {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();

  if (!tenantId) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem tenant.</CardContent>
      </Card>
    );
  }

  if (!user?.employeeId) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Usuário sem colaborador.</CardContent>
      </Card>
    );
  }

  const list = await listVacationsByEmployee(tenantId, user.employeeId);
  const vacations = (list ?? []).map((v) => ({
    id: v.id,
    startDate: String(v.startDate).slice(0, 10),
    endDate: String(v.endDate).slice(0, 10),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Férias</h1>
        <p className="text-ponto-muted">Cadastre seu período de férias para não contabilizar horas no banco.</p>
      </div>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle className="text-base">Meus períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <FeriasClient vacations={vacations} />
        </CardContent>
      </Card>
    </div>
  );
}
