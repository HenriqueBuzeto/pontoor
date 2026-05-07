"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFeriasAction, deleteFeriasAction, type FeriasState } from "./actions";

export function FeriasClient({ vacations }: { vacations: { id: string; startDate: string; endDate: string }[] }) {
  const [state, formAction] = useActionState<FeriasState, FormData>((prev, fd) => createFeriasAction(prev, fd), {});

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {state?.error && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Período de férias salvo.
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ponto-muted">Início</label>
          <Input name="startDate" type="date" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ponto-muted">Fim</label>
          <Input name="endDate" type="date" required />
        </div>
        <Button type="submit">Adicionar</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-ponto-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ponto-border bg-ponto-surface/50">
              <th className="px-4 py-3 text-left font-medium text-ponto-muted">Início</th>
              <th className="px-4 py-3 text-left font-medium text-ponto-muted">Fim</th>
              <th className="px-4 py-3 text-right font-medium text-ponto-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vacations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ponto-muted">
                  Nenhum período de férias cadastrado.
                </td>
              </tr>
            ) : (
              vacations.map((v) => (
                <tr key={v.id} className="border-b border-ponto-border/50">
                  <td className="px-4 py-3 font-medium">{v.startDate.split("-").reverse().join("/")}</td>
                  <td className="px-4 py-3 font-medium">{v.endDate.split("-").reverse().join("/")}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await deleteFeriasAction(v.id);
                        window.location.reload();
                      }}
                    >
                      Remover
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
