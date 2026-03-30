"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveAdjustmentAction,
  rejectAdjustmentAction,
  type ReviewState,
} from "./actions";
import { Check, X } from "lucide-react";

type Item = {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  reason: string;
};

const TYPE_LABEL: Record<string, string> = {
  late: "Atraso",
  absence: "Falta (não justificada)",
  justified_absence: "Falta justificada / atestado (não contar horas)",
  forgot_mark: "Esquecimento de marcação",
  early_leave: "Saída antecipada",
  external_work: "Trabalho externo",
  other: "Outro",
};

function extractSchedule(reason: string) {
  // Espera linhas no padrão:
  // - Expediente: HH:MM até HH:MM
  // - Almoço: HH:MM até HH:MM
  // - Hora extra: HH:MM até HH:MM
  const lines = reason.split(/\r?\n/).map((l) => l.trim());
  const get = (prefix: string) =>
    [...lines]
      .reverse()
      .find((l) => l.startsWith(prefix))
      ?.slice(prefix.length)
      .trim() ?? null;
  return {
    expediente: get("- Expediente:"),
    almoco: get("- Almoço:"),
    extra: get("- Hora extra:"),
    hasAny: lines.some((l) => l.startsWith("Horários informados para correção:")),
  };
}

export function JustificativasAdminList({ items }: { items: Item[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const [approveState, approveFormAction] = useActionState<ReviewState, FormData>(
    (prev, fd) => approveAdjustmentAction(prev, fd),
    {}
  );
  const [rejectState, rejectFormAction] = useActionState<ReviewState, FormData>(
    (prev, fd) => rejectAdjustmentAction(prev, fd),
    {}
  );

  return (
    <div className="divide-y divide-ponto-border/50">
      {(approveState?.error || rejectState?.error) && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {approveState?.error ?? rejectState?.error}
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ponto-black">{item.employeeName}</p>
            <p className="text-sm text-ponto-muted">
              {TYPE_LABEL[item.type] ?? item.type} • {item.date}
            </p>
            <p
              className="mt-1 text-sm text-ponto-muted whitespace-pre-line"
              title={item.reason}
            >
              {item.reason.length > 160 ? `${item.reason.slice(0, 160)}…` : item.reason}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {expandedId === item.id ? (
              <>
                {(() => {
                  const schedule = extractSchedule(item.reason);

                  return schedule.hasAny ? (
                    <div className="w-full max-w-md rounded-md border border-ponto-border bg-white px-3 py-2 text-xs">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ponto-muted-soft">
                          Horários solicitados
                        </p>
                        <div className="mt-2 grid gap-1 text-ponto-muted">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-ponto-black">Expediente</span>
                            <span className="font-mono">
                              {schedule.expediente ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-ponto-black">Almoço</span>
                            <span className="font-mono">
                              {schedule.almoco ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-ponto-black">Hora extra</span>
                            <span className="font-mono">
                              {schedule.extra ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                  ) : null;
                })()}
                <div className="w-full max-w-md rounded-md border border-ponto-border bg-ponto-surface px-3 py-2 text-xs text-ponto-muted whitespace-pre-line">
                  {item.reason}
                </div>
                <Input
                  placeholder="Comentário (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="h-9 w-48 text-sm"
                />
                <form action={approveFormAction} className="inline-flex">
                  <input type="hidden" name="adjustmentId" value={item.id} />
                  <input type="hidden" name="comment" value={comment} />
                  {(() => {
                    const schedule = extractSchedule(item.reason);

                    let expStart = "";
                    let expEnd = "";
                    let lunchStart = "";
                    let lunchEnd = "";
                    let extraStart = "";
                    let extraEnd = "";

                    const parseInterval = (value: string | null) => {
                      if (!value) return { start: "", end: "" };
                      const [start, , end] = value.split(" ");
                      return { start: start ?? "", end: end ?? "" };
                    };

                    if (schedule.expediente) {
                      const p = parseInterval(schedule.expediente);
                      expStart = p.start;
                      expEnd = p.end;
                    }
                    if (schedule.almoco) {
                      const p = parseInterval(schedule.almoco);
                      lunchStart = p.start;
                      lunchEnd = p.end;
                    }
                    if (schedule.extra) {
                      const p = parseInterval(schedule.extra);
                      extraStart = p.start;
                      extraEnd = p.end;
                    }

                    return (
                      <>
                        <input type="hidden" name="expStart" value={expStart} />
                        <input type="hidden" name="expEnd" value={expEnd} />
                        <input type="hidden" name="lunchStart" value={lunchStart} />
                        <input type="hidden" name="lunchEnd" value={lunchEnd} />
                        <input type="hidden" name="extraStart" value={extraStart} />
                        <input type="hidden" name="extraEnd" value={extraEnd} />
                      </>
                    );
                  })()}
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-4 w-4" />
                    Aprovar
                  </Button>
                </form>
                <form action={rejectFormAction} className="inline-flex">
                  <input type="hidden" name="adjustmentId" value={item.id} />
                  <input type="hidden" name="comment" value={comment} />
                  <Button type="submit" size="sm" variant="danger">
                    <X className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setExpandedId(null); setComment(""); }}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExpandedId(item.id)}
              >
                Revisar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
