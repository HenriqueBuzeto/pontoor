"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createColaboradorAction, type CreateColaboradorState } from "./actions";

const MIN_PASSWORD_LENGTH = 6;

type Branch = { id: string; name: string; code: string | null };
type Department = { id: string; name: string; code: string | null };
type Team = { id: string; name: string; code: string | null };
type Role = { id: string; name: string; code: string };
type WorkSchedule = { id: string; name: string; code: string | null; type: string };

type Props = {
  branches: Branch[];
  departments: Department[];
  teams: Team[];
  roles: Role[];
  workSchedules: WorkSchedule[];
  nextRegistration?: string;
};

const CONTRACT_TYPES = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
];

export function FormNovoColaborador({
  // props reservados para uso futuro em jornadas/organização
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  branches,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  departments,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  teams,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roles,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workSchedules,
  nextRegistration,
}: Props) {
  const [state, formAction] = useActionState<CreateColaboradorState, FormData>(
    (prev, fd) => createColaboradorAction(prev, fd),
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href="/app/colaboradores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ponto-black">Novo colaborador</h1>
          <p className="text-ponto-muted">Preencha os dados do colaborador</p>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {state?.login && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-lux">
          <CardHeader>
            <CardTitle className="text-emerald-800">Colaborador e acesso criados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-emerald-800">
              Anote as credenciais de acesso para repassar ao colaborador. A senha é a definida no formulário.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-white p-4 font-mono text-sm">
              <div className="grid gap-1 sm:grid-cols-[auto_1fr]">
                <span className="text-ponto-muted">Login:</span>
                <span className="font-semibold text-ponto-black">{state.login}</span>
                <span className="text-ponto-muted">Senha:</span>
                <span className="text-ponto-muted">(conforme definida no cadastro)</span>
              </div>
            </div>
            <Button asChild variant="secondary" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100">
              <Link href="/app/colaboradores">Voltar para a lista</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!state?.login && (
        <>
      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle>Dados principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Matrícula
                <span className="ml-1 text-xs font-normal text-ponto-muted-soft">
                  (deixe em branco para gerar automaticamente)
                </span>
              </label>
              <Input
                name="registration"
                defaultValue={nextRegistration ?? ""}
                placeholder={nextRegistration ?? "Ex: 001"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Nome completo *</label>
              <Input name="name" required placeholder="Nome do colaborador" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">CPF * (apenas números)</label>
              <Input name="cpf" required placeholder="11 dígitos" maxLength={11} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">E-mail</label>
              <Input name="email" type="email" placeholder="email@empresa.com" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Data de admissão *</label>
              <Input name="admissionDate" type="date" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Tipo de contrato</label>
              <select
                name="contractType"
                className="h-11 w-full rounded-lg border border-ponto-border bg-ponto-white px-4 text-sm"
              >
                {CONTRACT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">Status</label>
              <select
                name="status"
                className="h-11 w-full rounded-lg border border-ponto-border bg-ponto-white px-4 text-sm"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="on_leave">Afastado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle>Acesso ao sistema</CardTitle>
          <p className="text-sm font-normal text-ponto-muted">
            O login será gerado no formato <strong>primeiro.sobrenome</strong> (ex.: João Silva → joao.silva). O colaborador usará esse login e a senha abaixo para acessar o sistema.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-ponto-muted">Senha inicial *</label>
            <Input
              name="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-ponto-muted">Defina a senha que o colaborador usará no primeiro acesso.</p>
          </div>
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-ponto-muted">Tipo de acesso</label>
            <select
              name="role"
              className="h-11 w-full rounded-lg border border-ponto-border bg-ponto-white px-4 text-sm"
              defaultValue="employee"
            >
              <option value="employee">Colaborador (acesso padrão)</option>
              <option value="admin">Administrador (gerencia cadastros e relatórios)</option>
            </select>
            <p className="mt-1 text-xs text-ponto-muted-soft">
              Apenas usuários administradores conseguem criar novos administradores.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader>
          <CardTitle>Jornada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Início do expediente
              </label>
              <Input
                name="workStartTime"
                type="time"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Fim do expediente
              </label>
              <Input
                name="workEndTime"
                type="time"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Início do almoço
              </label>
              <Input
                name="lunchStartTime"
                type="time"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ponto-muted">
                Fim do almoço
              </label>
              <Input
                name="lunchEndTime"
                type="time"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="mb-1 block text-sm font-medium text-ponto-muted">
              Dias de trabalho na semana
            </label>
            <Input
              name="workDaysPerWeek"
              type="number"
              min={1}
              max={7}
              placeholder="Ex: 5"
            />
            <p className="mt-1 text-xs text-ponto-muted-soft">
              Informe quantos dias por semana o colaborador trabalha (1 a 7).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">Salvar colaborador</Button>
        <Button type="button" variant="secondary" asChild>
          <Link href="/app/colaboradores">Cancelar</Link>
        </Button>
      </div>
        </>
      )}
    </form>
  );
}
