"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, LogOut, Coffee, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { registerTimeEntry, getTodayEntries, type TodayEntry } from "./actions";

const types = [
  { id: "clock_in", label: "Entrada", icon: LogIn },
  { id: "break_start", label: "Início intervalo", icon: Coffee },
  { id: "break_end", label: "Fim intervalo", icon: Coffee },
  { id: "clock_out", label: "Saída", icon: LogOut },
] as const;

export default function PontoPage() {
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [lastMark, setLastMark] = useState<{ type: string; at: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);

  const todayEntriesDeduped = useMemo(() => {
    const seen = new Set<string>();
    const result: TodayEntry[] = [];
    for (const e of todayEntries) {
      const key = `${e.type}-${e.occurredAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(e);
      }
    }
    return result;
  }, [todayEntries]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    getTodayEntries().then(setTodayEntries).catch(() => setTodayEntries([]));
  }, []);

  async function handleMark(type: string) {
    setError(null);
    setLoading(true);
    const at = new Date();
    const formData = new FormData();
    formData.set("type", type);
    formData.set("occurredAt", at.toISOString());
    const result = await registerTimeEntry(formData);
    setLoading(false);
    if (result.ok) {
      setLastMark({ type, at });
      // atualiza lista de marcações do dia após novo registro
      getTodayEntries().then(setTodayEntries).catch(() => {});
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-in-fade">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ponto-black">Registro de Ponto</h1>
        <p className="mt-1 text-ponto-muted">Registre sua entrada, saída e intervalos</p>
      </div>

      <Card className="overflow-hidden border-ponto-orange/20 bg-gradient-to-b from-ponto-orange-muted/50 to-ponto-orange-muted/20">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium text-ponto-muted">Data e hora atuais</p>
          <p className="mt-2 text-2xl font-bold text-ponto-black sm:text-3xl">
            {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-ponto-orange sm:text-4xl">
            {format(now, "HH:mm:ss")}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {types.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            size="lg"
            className="h-24 flex-col gap-2"
            disabled={loading}
            onClick={() => handleMark(id)}
          >
            <Icon className="h-8 w-8" />
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <Card className="border-ponto-error/30 bg-red-50/90">
          <CardContent className="p-4 text-center text-sm text-ponto-error">
            {error}
          </CardContent>
        </Card>
      )}
      {lastMark && !error && (
        <Card className="border-emerald-300/60 bg-emerald-50/90 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="text-left">
                <p className="font-semibold">Registro de ponto realizado com sucesso</p>
                <p className="text-xs">
                  Horário registrado:{" "}
                  <span className="font-mono font-semibold">
                    {format(lastMark.at, "HH:mm:ss")}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {todayEntriesDeduped.length > 0 && (
        <Card className="border-ponto-border shadow-lux">
          <CardHeader className="border-b border-ponto-border/50">
            <CardTitle className="text-sm font-semibold text-ponto-black">
              Marcações de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-sm text-ponto-muted space-y-1.5">
            {todayEntriesDeduped.map((e, idx) => {
              const type = types.find((t) => t.id === e.type)?.label ?? e.type;
              const time = format(new Date(e.occurredAt), "HH:mm:ss");
              return (
                <div key={`${e.type}-${e.occurredAt}-${idx}`} className="flex items-center justify-between">
                  <span>{type}</span>
                  <span className="font-mono text-ponto-black">{time}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-ponto-muted">
        Suas marcações são registradas com data, hora e origem (navegador).
        Em caso de dúvida, consulte o espelho de ponto ou solicite um ajuste.
      </p>
    </div>
  );
}
