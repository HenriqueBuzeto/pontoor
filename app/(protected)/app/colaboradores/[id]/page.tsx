import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { getEmployeeById } from "@/lib/repositories/employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarColaboradorClient } from "./page-client";

type Props = { params: Promise<{ id: string }> };

export default async function EditarColaboradorPage({ params }: Props) {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const { id } = await params;

  if (!tenantId || !user) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem acesso.</CardContent>
      </Card>
    );
  }

  const employee = await getEmployeeById(tenantId, id);
  if (!employee) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Colaborador não encontrado.</CardContent>
      </Card>
    );
  }

  const canAdmin = await isAdmin();
  const canEditSelf = !!user.employeeId && user.employeeId === employee.id;
  if (!canAdmin && !canEditSelf) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem permissão.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Editar colaborador</h1>
        <p className="text-ponto-muted">Atualize os dados do cadastro</p>
      </div>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle className="text-base">Dados principais</CardTitle>
        </CardHeader>
        <CardContent>
          <EditarColaboradorClient employeeId={employee.id} initialName={employee.name} />
        </CardContent>
      </Card>
    </div>
  );
}
