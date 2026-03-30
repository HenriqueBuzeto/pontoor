"use client";

import { useState, useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdjustmentAction, type CreateAdjustmentState } from "../ajustes/actions";

type DayRow = {
  date: string; // YYYY-MM-DD
  displayDate: string;
  entry: string | null;
  exit: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  extraStart: string | null;
  extraEnd: string | null;
  workedLabel: string;
  dayBalanceLabel: string;
  justifiedLabel?: string | null;
};

type Props = {
  rows: DayRow[];
};

export function BancoHorasTabelaAjustes({ rows }: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [extraStart, setExtraStart] = useState("");
  const [extraEnd, setExtraEnd] = useState("");

  const [state, formAction] = useActionState<CreateAdjustmentState, FormData>(
    (prev, fd) => createAdjustmentAction(prev, fd),
    {}
  );

  // Quando o ajuste for enviado com sucesso, fecha o formulário e limpa os campos
  useEffect(() => {
    if (state?.success) {
      setExpandedDate(null);
      setStartTime("");
      setEndTime("");
      setReason("");
      setLunchStart("");
      setLunchEnd("");
      setExtraStart("");
      setExtraEnd("");
    }
  }, [state?.success]);

  const openForDay = (row: DayRow) => {
    setExpandedDate(row.date);
    setStartTime(row.entry ?? "");
    setEndTime(row.exit ?? "");
    setLunchStart(row.lunchStart ?? "");
    setLunchEnd(row.lunchEnd ?? "");
    setExtraStart(row.extraStart ?? "");
    setExtraEnd(row.extraEnd ?? "");
    setReason(`Solicito ajuste no dia ${row.displayDate}.`);
  };

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
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Entrada</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Saída</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Início almoço</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Fim almoço</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Início extra</th>
            <th className="px-4 py-3 text-left font-medium text-ponto-muted">Fim extra</th>
            <th className="px-4 py-3 text-right font-medium text-ponto-muted">Horas trabalhadas</th>
            <th className="px-4 py-3 text-right font-medium text-ponto-muted">Saldo do dia</th>
            <th className="px-4 py-3 text-right font-medium text-ponto-muted">Ajuste de ponto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isExpanded = expandedDate === r.date;
            return (
              <tr key={r.date} className="border-b border-ponto-border/50 align-top">
                <td className="px-4 py-3 text-ponto-muted">
                  <div>{r.displayDate}</div>
                  {r.justifiedLabel && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                      {r.justifiedLabel}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{r.entry ?? "—"}</td>
                <td className="px-4 py-3">{r.exit ?? "—"}</td>
                <td className="px-4 py-3">{r.lunchStart ?? "—"}</td>
                <td className="px-4 py-3">{r.lunchEnd ?? "—"}</td>
                <td className="px-4 py-3">{r.extraStart ?? "00:00"}</td>
                <td className="px-4 py-3">{r.extraEnd ?? "00:00"}</td>
                <td className="px-4 py-3 text-right font-medium">{r.workedLabel}</td>
                <td className="px-4 py-3 text-right">{r.dayBalanceLabel}</td>
                <td className="px-4 py-3 text-right">
                  {!isExpanded && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs rounded-full bg-ponto-orange text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all duration-150"
                      onClick={() => openForDay(r)}
                    >
                      Ajuste de ponto
                    </Button>
                  )}
                  {isExpanded && (
                    <div className="mt-2 space-y-2 text-xs text-ponto-muted">
                      <form action={formAction} className="space-y-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-ponto-muted">
                            Tipo de ajuste
                          </label>
                          <select
                            name="type"
                            className="h-8 w-full rounded-md border border-ponto-border bg-ponto-white px-2 text-[11px]"
                            defaultValue="other"
                          >
                            <option value="other">Correção de horário</option>
                            <option value="justified_absence">
                              Falta justificada / atestado (não contar horas)
                            </option>
                          </select>
                        </div>
                        <input type="hidden" name="date" value={r.date} />
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
                          <span className="self-center text-[11px] text-ponto-muted">até</span>
                          <Input
                            name="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <label className="mb-1 block text-[11px] font-medium text-ponto-muted">
                          Período de almoço
                        </label>
                        <div className="flex gap-2">
                          <Input
                            name="lunchStart"
                            type="time"
                            value={lunchStart}
                            onChange={(e) => setLunchStart(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <span className="self-center text-[11px] text-ponto-muted">até</span>
                          <Input
                            name="lunchEnd"
                            type="time"
                            value={lunchEnd}
                            onChange={(e) => setLunchEnd(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <label className="mb-1 block text-[11px] font-medium text-ponto-muted">
                          Hora extra (se houver)
                        </label>
                        <div className="flex gap-2">
                          <Input
                            name="extraStart"
                            type="time"
                            value={extraStart}
                            onChange={(e) => setExtraStart(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <span className="self-center text-[11px] text-ponto-muted">até</span>
                          <Input
                            name="extraEnd"
                            type="time"
                            value={extraEnd}
                            onChange={(e) => setExtraEnd(e.target.value)}
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
                              setLunchStart("");
                              setLunchEnd("");
                              setExtraStart("");
                              setExtraEnd("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </div>
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

