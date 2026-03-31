"use client";

import { useState, useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdjustmentAction, type CreateAdjustmentState } from "../ajustes/actions";

type Entry = {
  id: string;
  occurredAt: string;
  type: string;
};

type Props = {
  entries: Entry[];
};

const TZ = "America/Sao_Paulo";

function dateKeySP(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

const TYPE_LABEL: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_start: "Início intervalo",
  break_end: "Fim intervalo",
  pause_start: "Pausa início",
  pause_end: "Pausa fim",
};

export function EspelhoTabelaAjustes({ entries }: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [state, formAction] = useActionState<CreateAdjustmentState, FormData>(
    (prev, fd) => createAdjustmentAction(prev, fd),
    {}
  );

  // Ao enviar com sucesso, fecha o formulário do dia e limpa os campos
  useEffect(() => {
    if (state?.success) {
      setExpandedDate(null);
      setStartTime("");
      setEndTime("");
      setReason("");
    }
  }, [state?.success]);

  const groups = new Map<
    string,
    { date: Date; items: { time: Date; type: string }[] }
  >();

  for (const e of entries) {
    const d = new Date(e.occurredAt);
    const key = dateKeySP(d);
    const bucket =
      groups.get(key) ?? {
        date: dateFromKey(key),
        items: [] as { time: Date; type: string }[],
      };
    bucket.items.push({ time: d, type: e.type });
    groups.set(key, bucket);
  }

  const days = Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      date: value.date,
      items: value.items.sort((a, b) => a.time.getTime() - b.time.getTime()),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="overflow-x-auto">
      {state?.error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 transition-all duration-300">
          Ajuste de ponto enviado com sucesso para aprovação.
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ponto-border bg-ponto-surface/50">
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Data</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">
              Marcações do dia
            </th>
            <th className="px-4 py-3 text-right font-medium text-ponto-muted">
              Ajuste de ponto
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const isExpanded = expandedDate === day.key;
            const displayDate = day.date.toLocaleDateString("pt-BR", { timeZone: TZ });

            return (
              <tr key={day.key} className="border-b border-ponto-border/50 align-top">
                <td className="px-4 py-3 text-ponto-muted">{displayDate}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {day.items.map((item, idx) => {
                      const timeLabel = item.time.toLocaleTimeString("pt-BR", {
                        timeZone: TZ,
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const typeLabel = TYPE_LABEL[item.type] ?? item.type;
                      return (
                        <span
                          key={`${day.key}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-full bg-ponto-surface px-2 py-1 text-[11px] text-ponto-muted"
                        >
                          <span className="font-mono text-[11px] text-ponto-black">
                            {timeLabel}
                          </span>
                          <span>• {typeLabel}</span>
                        </span>
                      );
                    })}
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-xs text-ponto-muted">
                      <form action={formAction} className="space-y-2">
                        <input type="hidden" name="type" value="other" />
                        <input type="hidden" name="date" value={day.key} />
                        <label className="mb-1 block text-[11px] font-medium text-ponto-muted">
                          Horário que deseja ajustar
                        </label>
                        <div className="flex gap-2">
                          <Input
                            name="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <span className="self-center text-[11px] text-ponto-muted">
                            até
                          </span>
                          <Input
                            name="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <label className="mb-1 block text-[11px] font-medium text-ponto-muted">
                          Descrição do ajuste
                        </label>
                        <Input
                          name="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Explique o que está errado e como deveria ficar."
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" className="h-8 px-3 text-xs">
                            Enviar ajuste
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              setExpandedDate(null);
                              setStartTime("");
                              setEndTime("");
                              setReason("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!isExpanded && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs rounded-full bg-ponto-orange text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all"
                      onClick={() => {
                        setExpandedDate(day.key);
                        setStartTime("");
                        setEndTime("");
                        setReason(`Solicito ajuste no dia ${displayDate}.`);
                      }}
                    >
                      Ajuste de ponto
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

