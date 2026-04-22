"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHolidayAction, deleteHolidayAction, type HolidayAdminState } from "./actions";

export function FeriadosAdminClient({
  initialYear,
  holidays,
}: {
  initialYear: number;
  holidays: { date: string; name: string }[];
}) {
  const [state, formAction] = useActionState<HolidayAdminState, FormData>((prev, fd) => createHolidayAction(prev, fd), {});

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
            Feriado salvo.
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ponto-muted">Data</label>
          <Input name="date" type="date" required defaultValue={`${initialYear}-01-01`} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-sm font-medium text-ponto-muted">Nome</label>
          <Input name="name" placeholder="Ex.: Aniversário da cidade" required />
        </div>
        <Button type="submit">Adicionar</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-ponto-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ponto-border bg-ponto-surface/50">
              <th className="px-4 py-3 text-left font-medium text-ponto-muted">Data</th>
              <th className="px-4 py-3 text-left font-medium text-ponto-muted">Nome</th>
              <th className="px-4 py-3 text-right font-medium text-ponto-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ponto-muted">
                  Nenhum feriado cadastrado.
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.date} className="border-b border-ponto-border/50">
                  <td className="px-4 py-3 font-medium">{h.date.split("-").reverse().join("/")}</td>
                  <td className="px-4 py-3">{h.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await deleteHolidayAction(h.date);
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

      <div className="text-sm text-ponto-muted">
        Observação: feriados nacionais são puxados automaticamente. Aqui você cadastra feriados municipais (ex.: Colina/SP).
      </div>
    </div>
  );
}
