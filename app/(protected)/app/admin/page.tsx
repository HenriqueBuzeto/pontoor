import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listEmployees } from "@/lib/repositories/employees";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { listAllBalances } from "@/lib/repositories/hour-bank";
import { listBranches } from "@/lib/repositories/branches";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UsersRound,
  ClipboardCheck,
  Wallet,
  Building2,
  FileBarChart,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ponto-black">Painel Administrativo</h1>
        <Card className="border-ponto-border">
          <CardContent className="p-8 text-center text-ponto-muted">
            Sem acesso ao tenant.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [employeesData, adjustments, balances, branches] = await Promise.all([
    listEmployees(tenantId, { page: 1, status: "active" }),
    listAdjustments(tenantId, { status: "pending", limit: 100 }),
    listAllBalances(tenantId),
    listBranches(tenantId),
  ]);

  const pendingCount = adjustments.length;
  const totalEmployees = employeesData.total;
  const totalBalances = balances.length;
  const totalBranches = branches.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ponto-black">
          Painel Administrativo
        </h1>
        <p className="mt-1 text-ponto-muted">
          Visão geral da empresa, justificativas e relatórios
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-ponto-border shadow-lux">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ponto-muted">Colaboradores ativos</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lux bg-ponto-orange/10 text-ponto-orange">
                <UsersRound className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-ponto-black">
              {totalEmployees}
            </p>
          </CardContent>
        </Card>
        <Card className="border-ponto-border shadow-lux">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ponto-muted">Justificativas pendentes</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lux bg-amber-100 text-amber-700">
                <ClipboardCheck className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-ponto-black">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-ponto-border shadow-lux">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ponto-muted">Saldos banco de horas</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lux bg-emerald-100 text-emerald-700">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-ponto-black">
              {totalBalances}
            </p>
          </CardContent>
        </Card>
        <Card className="border-ponto-border shadow-lux">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ponto-muted">Filiais</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lux bg-blue-100 text-blue-700">
                <Building2 className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-ponto-black">
              {totalBranches}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-ponto-border shadow-lux">
        <CardHeader className="border-b border-ponto-border/50">
          <CardTitle className="text-base">Ações administrativas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="secondary" className="h-auto flex-col items-start gap-2 py-4">
            <Link href="/app/admin/justificativas" className="flex w-full items-center gap-3 text-left">
              <ClipboardList className="h-5 w-5 shrink-0 text-amber-600" />
              <span className="flex-1">
                Aprovar justificativas
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {pendingCount}
                  </span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ponto-muted" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto flex-col items-start gap-2 py-4">
            <Link href="/app/admin/relatorios" className="flex w-full items-center gap-3 text-left">
              <FileBarChart className="h-5 w-5 shrink-0 text-ponto-orange" />
              <span className="flex-1">Relatórios empresariais</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ponto-muted" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto flex-col items-start gap-2 py-4">
            <Link href="/app/admin/banco-horas" className="flex w-full items-center gap-3 text-left">
              <Wallet className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="flex-1">Banco de horas (empresa)</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ponto-muted" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto flex-col items-start gap-2 py-4">
            <Link href="/app/colaboradores" className="flex w-full items-center gap-3 text-left">
              <UsersRound className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="flex-1">Colaboradores</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ponto-muted" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
