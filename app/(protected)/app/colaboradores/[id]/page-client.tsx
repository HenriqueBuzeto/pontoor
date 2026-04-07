"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateColaboradorNameAction, type UpdateColaboradorState } from "./actions";

export function EditarColaboradorClient({
  employeeId,
  initialName,
}: {
  employeeId: string;
  initialName: string;
}) {
  const [state, formAction] = useActionState<UpdateColaboradorState, FormData>(
    (prev, fd) => updateColaboradorNameAction(employeeId, prev, fd),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Cadastro atualizado com sucesso.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Nome</label>
        <Input name="name" defaultValue={initialName} required />
      </div>

      <Button type="submit">Salvar</Button>
    </form>
  );
}
