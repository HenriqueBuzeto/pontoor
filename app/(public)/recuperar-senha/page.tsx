"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RecuperarSenhaPage() {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ponto-surface px-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />
        <div className="relative w-full max-w-[400px] rounded-lux-xl border border-ponto-border-soft bg-white/80 p-8 text-center shadow-lux-lg backdrop-blur-xl animate-in-up">
          <h1 className="text-2xl font-bold tracking-tight text-ponto-black">Solicitação enviada</h1>
          <p className="mt-4 text-sm text-ponto-muted">
            Se existir uma conta com esse usuário, o administrador poderá redefinir a senha ou você receberá um link.
          </p>
          <Button asChild className="mt-6">
            <Link href="/login">Voltar ao login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ponto-surface px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />
      <div className="relative w-full max-w-[400px] animate-in-up">
        <div className="rounded-lux-xl border border-ponto-border-soft bg-white/80 p-8 shadow-lux-lg backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ponto-black">
              <span className="text-ponto-black">Ponto</span>{" "}
              <span className="text-ponto-orange">OR</span>
            </h1>
            <p className="mt-2 text-sm text-ponto-muted">Recuperação de senha</p>
          </div>

          <div className="rounded-lux border border-ponto-border-soft bg-white/70 px-4 py-3 text-sm text-ponto-muted">
            Recuperação de senha desativada nesta versão (sem Supabase). Solicite ao administrador para redefinir.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lux border border-ponto-error/30 bg-red-50/90 px-4 py-3 text-sm text-ponto-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-ponto-black">
                Usuário
              </label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Enviando…" : "Solicitar redefinição"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ponto-muted">
            <Link href="/login" className="font-medium text-ponto-orange hover:underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
