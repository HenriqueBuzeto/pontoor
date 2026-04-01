"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Coffee, LogIn, LogOut, UserRound } from "lucide-react";

const types = [
  { id: "clock_in", label: "Entrada", icon: LogIn },
  { id: "break_start", label: "Início intervalo", icon: Coffee },
  { id: "break_end", label: "Fim intervalo", icon: Coffee },
  { id: "clock_out", label: "Saída", icon: LogOut },
] as const;

type LookupResponse =
  | { ok: true; employee: { id: string; tenantId: string; name: string; registration: string } }
  | { ok: false; error: string };

type MarkResponse = { ok: true; id: string } | { ok: false; error: string };

export default function TotemClient() {
  const [now, setNow] = useState(() => new Date());
  const [registration, setRegistration] = useState("");
  const [employee, setEmployee] = useState<{ id: string; tenantId: string; name: string; registration: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMark, setLastMark] = useState<{ type: string; at: Date } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const readyForLookup = useMemo(() => registration.trim().length >= 1, [registration]);
  const readyForMark = useMemo(() => !!employee?.id, [employee]);

  function resetToStart() {
    setEmployee(null);
    setRegistration("");
    setLastMark(null);
    setError(null);

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  }

  async function lookup() {
    setError(null);
    setLastMark(null);
    setEmployee(null);

    const reg = registration.trim();
    if (!reg) return;

    setLoading(true);
    try {
      const res = await fetch("/api/kiosk/lookup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ registration: reg }),
      });
      const data = (await res.json().catch(() => null)) as LookupResponse | null;
      if (!res.ok || !data || !data.ok) {
        const msg = data && "error" in data ? data.error : "Não foi possível localizar o colaborador.";
        setError(msg);
        return null;
      }
      setEmployee(data.employee);
      return data.employee;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conectar.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function ensureEmployee() {
    if (employee?.id) return employee;
    return lookup();
  }

  async function mark(type: string) {
    if (loading) return;

    const emp = await ensureEmployee();
    if (!emp?.id) return;

    setError(null);
    setLoading(true);
    const at = new Date();

    try {
      const res = await fetch("/api/kiosk/mark", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ employeeId: emp.id, type, occurredAt: at.toISOString() }),
      });

      const data = (await res.json().catch(() => null)) as MarkResponse | null;
      if (!res.ok || !data) {
        setError("Erro ao registrar ponto.");
        return;
      }

      if (!data.ok) {
        setError(data.error);
        return;
      }

      setLastMark({ type, at });

      setTimeout(() => {
        resetToStart();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#050509] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.28),transparent_55%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.95),transparent_65%)]" />

      <div className="relative w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Totem de Ponto</h1>
            <p className="mt-1 text-sm text-white/70">
              Digite sua matrícula, confirme seu nome e registre a batida.
            </p>
          </div>
          <Link href="/login" className="text-sm font-medium text-ponto-orange hover:underline">
            Área do sistema
          </Link>
        </div>

        <Card className="overflow-hidden border-white/15 bg-white/10 shadow-[0_26px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm font-medium text-white/70">Data e hora atuais</p>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-ponto-orange sm:text-5xl">
              {format(now, "HH:mm:ss")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/15 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.22)]">
          <CardHeader className="border-b border-ponto-border/40">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-black">Matrícula</label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  placeholder="Ex: 001 ou ADM001"
                  className="border-ponto-border bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (readyForLookup) lookup();
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={loading || !readyForLookup}
                  onClick={lookup}
                  className="gap-2 min-w-28"
                  size="lg"
                >
                  <UserRound className="h-4 w-4" />
                  Buscar
                </Button>
              </div>
              <p className="mt-1 text-xs text-ponto-muted">
                Dica: você pode digitar somente os 3 últimos dígitos (ex.: 001) ou o código completo (ex.: ADM001).
              </p>
            </div>

            {employee && (
              <div className="rounded-xl border border-ponto-border bg-ponto-surface p-4">
                <p className="text-sm text-ponto-muted">Confirme seu nome:</p>
                <p className="mt-1 text-lg font-semibold text-ponto-black">
                  {employee.name} ({employee.registration})
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {types.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  size="lg"
                  className="h-20 flex-col gap-2"
                  disabled={loading || !readyForMark}
                  onClick={() => mark(id)}
                >
                  <Icon className="h-7 w-7" />
                  {label}
                </Button>
              ))}
            </div>

            {error && (
              <div className="rounded-lux border border-ponto-error/30 bg-red-50/90 px-4 py-3 text-sm text-ponto-error">
                {error}
              </div>
            )}

            {lastMark && !error && (
              <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/90 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Ponto registrado com sucesso</p>
                    <p className="text-xs">
                      Horário: <span className="font-mono font-semibold">{format(lastMark.at, "HH:mm:ss")}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-ponto-muted">
              Para acessar relatórios, banco de horas, ajustes e espelho completo, faça login.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
