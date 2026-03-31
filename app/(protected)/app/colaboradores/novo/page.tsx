import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getNextEmployeeRegistration } from "@/lib/repositories/employees";
import { FormNovoColaborador } from "./form-novo-colaborador";
import { Card, CardContent } from "@/components/ui/card";

export default async function NovoColaboradorPage() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Novo colaborador</h1>
        <Card>
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso. Vincule-se a um tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextRegistration = await getNextEmployeeRegistration(tenantId);

  return (
    <FormNovoColaborador
      branches={[]}
      departments={[]}
      teams={[]}
      roles={[]}
      workSchedules={[]}
      nextRegistration={nextRegistration}
    />
  );
}
