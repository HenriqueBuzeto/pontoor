"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateColaboradorNameAction,
  updateColaboradorPasswordAction,
  type UpdateColaboradorState,
} from "./actions";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";

export function EditarColaboradorClient({
  employeeId,
  initialName,
  canAdmin,
  userEmail,
}: {
  employeeId: string;
  initialName: string;
  canAdmin?: boolean;
  userEmail?: string | null;
}) {
  const [nameState, nameFormAction] = useActionState<UpdateColaboradorState, FormData>(
    (prev, fd) => updateColaboradorNameAction(employeeId, prev, fd),
    {}
  );

  const [passwordState, passwordFormAction] = useActionState<UpdateColaboradorState, FormData>(
    (prev, fd) => updateColaboradorPasswordAction(employeeId, prev, fd),
    {}
  );

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-8">
      <form action={nameFormAction} className="space-y-4">
        {nameState?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {nameState.error}
          </div>
        )}
        {nameState?.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {nameState.message || "Cadastro atualizado com sucesso."}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ponto-muted">Nome do Colaborador</label>
          <Input name="name" defaultValue={initialName} required />
        </div>

        {userEmail && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ponto-muted">Login / Usuário de Acesso</label>
            <Input value={userEmail} disabled className="bg-ponto-surface-muted cursor-not-allowed" />
          </div>
        )}

        <Button type="submit">Salvar Nome</Button>
      </form>

      {canAdmin && (
        <div className="border-t border-ponto-border/60 pt-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-ponto-primary" />
            <div>
              <h2 className="text-sm font-semibold text-ponto-black">Redefinir Senha de Acesso</h2>
              <p className="text-xs text-ponto-muted">
                Altere a senha deste colaborador. O sistema criará o hash criptografado com segurança automaticamente.
              </p>
            </div>
          </div>

          <form action={passwordFormAction} className="space-y-4">
            {passwordState?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {passwordState.error}
              </div>
            )}
            {passwordState?.success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {passwordState.message || "Senha alterada com sucesso!"}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-ponto-muted">Nova Senha</label>
                <div className="relative">
                  <Input
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres (ex: 232323)"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ponto-muted hover:text-ponto-black"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ponto-muted">Confirmar Nova Senha</label>
                <Input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  required
                  minLength={4}
                />
              </div>
            </div>

            <Button type="submit" variant="secondary" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Alterar Senha
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
