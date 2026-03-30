"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateAdjustmentState } from "./actions";
import { createAdjustmentAction } from "./actions";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "late", label: "Atraso" },
  { value: "absence", label: "Falta (não justificada)" },
  { value: "justified_absence", label: "Falta justificada / atestado (não contar horas)" },
  { value: "forgot_mark", label: "Esquecimento de marcação" },
  { value: "early_leave", label: "Saída antecipada" },
  { value: "external_work", label: "Trabalho externo" },
  { value: "other", label: "Outro" },
];

export function AjustesForm() {
  const [state, formAction] = useActionState<CreateAdjustmentState, FormData>(
    (prev, fd) => createAdjustmentAction(prev, fd),
    {}
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Solicitação enviada para aprovação do administrador.
        </div>
      )}

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle>Novo ajuste / justificativa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Tipo *</label>
              <select
                name="type"
                className="h-10 w-full rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
                defaultValue={TYPE_OPTIONS[0]?.value}
                required
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Data *</label>
              <Input name="date" type="date" defaultValue={today} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Início do expediente
              </label>
              <Input name="startTime" type="time" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Fim do expediente
              </label>
              <Input name="endTime" type="time" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Início do almoço
              </label>
              <Input name="lunchStart" type="time" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Fim do almoço
              </label>
              <Input name="lunchEnd" type="time" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Início da hora extra (opcional)
              </label>
              <Input name="extraStart" type="time" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Fim da hora extra (opcional)
              </label>
              <Input name="extraEnd" type="time" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ponto-muted">
              Motivo / descrição *
            </label>
            <textarea
              name="reason"
              required
              rows={3}
              className="w-full rounded-md border border-ponto-border bg-ponto-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ponto-orange/60"
              placeholder="Explique o motivo do ajuste ou justificativa (ex.: atraso devido a trânsito, consulta médica, esqueci de registrar a saída, etc.)"
            />
          </div>
          <Button type="submit">Enviar para aprovação</Button>
        </CardContent>
      </Card>
    </form>
  );
}

