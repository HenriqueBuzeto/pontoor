"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/app";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Usuário ou senha inválidos");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050509] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.28),transparent_55%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.95),transparent_65%)]" />

      <div className="relative w-full max-w-[420px] animate-in-up">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-[1.5px] shadow-[0_26px_80px_rgba(0,0,0,0.78)] backdrop-blur-2xl">
          <div className="rounded-[1.6rem] bg-white/95 px-8 py-9 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-40 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Ponto OR"
                  width={160}
                  height={80}
                  className="h-auto w-full object-contain drop-shadow-[0_0_30px_rgba(249,115,22,0.35)]"
                  priority
                />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-ponto-black">
                <span className="text-ponto-black">Ponto</span>{" "}
                <span className="text-ponto-orange">OR</span>
              </h1>
              <p className="mt-2 text-sm text-ponto-muted">Entre na sua conta corporativa</p>
              <div className="mx-auto mt-4 h-[2px] w-20 rounded-full bg-gradient-to-r from-ponto-orange via-amber-300 to-ponto-orange" />
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
                  className="border-ponto-border bg-ponto-white text-ponto-black placeholder:text-ponto-muted-soft shadow-sm transition-all focus:border-ponto-orange focus:ring-2 focus:ring-ponto-orange/20"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-ponto-black">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-ponto-border bg-ponto-white text-ponto-black placeholder:text-ponto-muted-soft shadow-sm transition-all focus:border-ponto-orange focus:ring-2 focus:ring-ponto-orange/20"
                />
              </div>
              <div className="flex justify-end">
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-medium text-ponto-orange transition-colors hover:text-ponto-orange-hover"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <p className="text-center text-xs text-ponto-muted-soft">
                Use o usuário e a senha fornecidos pelo administrador.
              </p>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-ponto-orange hover:bg-ponto-orange-hover shadow-[0_10px_40px_rgba(249,115,22,0.55)]"
                size="lg"
              >
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              <Link href="/" className="font-medium text-ponto-orange hover:underline">
                Voltar ao início
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
