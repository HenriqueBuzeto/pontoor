"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileNameAction, type UpdateProfileState } from "./actions";

export function PerfilClient({ initialName }: { initialName: string }) {
  const [state, formAction] = useActionState<UpdateProfileState, FormData>(
    (prev, fd) => updateProfileNameAction(prev, fd),
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Dados atualizados com sucesso.
        </div>
      )}

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle>Meu cadastro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ponto-muted">Nome</label>
            <Input name="name" defaultValue={initialName} required />
          </div>
          <Button type="submit">Salvar</Button>
        </CardContent>
      </Card>
    </form>
  );
}
