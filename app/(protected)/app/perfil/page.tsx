import { getCurrentUser } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Card className="border-ponto-border">
        <CardContent className="p-8 text-center text-ponto-muted">Sem acesso.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ponto-black">Perfil</h1>
        <p className="text-ponto-muted">Atualize seus dados de cadastro</p>
      </div>
      <PerfilClient initialName={user.name} />
    </div>
  );
}
