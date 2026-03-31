import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { listAdjustments } from "@/lib/repositories/adjustments";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";
import {
  getDailyCalculationByEmployeeAndDate,
  listDailyCalculationsByEmployee,
  sumBalanceMinutesByEmployeeInRange,
} from "@/lib/repositories/time-calculations";
import { getEmployeeById } from "@/lib/repositories/employees";
import { AppWelcomeHero } from "@/components/app/AppWelcomeHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Clock, CalendarDays, CloudSun, AlertCircle, CheckCircle2 } from "lucide-react";
import { BankHoursTrendChart } from "@/components/app/BankHoursTrendChart";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = user.tenantId ?? null;
  const employeeId = user.employeeId ?? null;

  let bankMinutes: number | null = null;
  let pendingAdjustments = 0;
  let trendData: {
    label: string;
    workedMinutes: number;
    expectedMinutes: number;
    balanceMinutes: number;
  }[] = [];
  let daysWithMarks = 0;
  let marksToday = 0;

  if (tenantId && employeeId) {
    const employee = await getEmployeeById(tenantId, employeeId);
    const admissionDateRaw = employee?.admissionDate ?? null;
    const admissionDateKey = admissionDateRaw ? String(admissionDateRaw).slice(0, 10) : null;

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6); // últimos 7 dias

    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);

    const [adjustments, recentEntries] = await Promise.all([
      listAdjustments(tenantId, { status: "pending", employeeId, limit: 20 }),
      listTimeEntriesByEmployee(tenantId, employeeId, start, end),
    ]);
    pendingAdjustments = adjustments.length;

    // marcações por dia (para métricas rápidas e gráfico)
    const byDay = new Map<string, { date: Date }>();
    for (const e of recentEntries) {
      const d = new Date(e.occurredAt);
      const key = d.toISOString().slice(0, 10);
      if (!byDay.has(key)) {
        byDay.set(key, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()) });
      }
      // contagem de hoje
      const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (isToday) marksToday += 1;
    }
    daysWithMarks = byDay.size;

    // Tendência e saldo do mês atual (mesma regra da tela Banco de Horas)
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const [calcRows, approvedAbsences] = await Promise.all([
      listDailyCalculationsByEmployee(tenantId, employeeId, year, month),
      listAdjustments(tenantId, {
        status: "approved",
        employeeId,
        limit: 200,
        fromDate: start,
        toDate: tomorrow,
      }),
    ]);

    const justifiedDays = new Set(
      approvedAbsences
        .filter((a) => a.type === "justified_absence")
        .map((a) => a.date.toISOString().slice(0, 10))
    );

    const byDayCalc = new Map<string, (typeof calcRows)[number]>();
    for (const r of calcRows ?? []) {
      const rawDate = r.date as unknown;
      const key =
        rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);
      byDayCalc.set(key, r);
    }

    if (admissionDateKey) {
      const total = await sumBalanceMinutesByEmployeeInRange(
        tenantId,
        employeeId,
        admissionDateKey,
        tomorrowKey
      );

      const todayKey = now.toISOString().slice(0, 10);
      const todayCalc = await getDailyCalculationByEmployeeAndDate(tenantId, employeeId, todayKey);
      const todayAdjusted = todayCalc && (todayCalc.balanceMinutes ?? 0) < 0 ? 0 : (todayCalc?.balanceMinutes ?? 0);
      const totalWithoutToday = total - (todayCalc?.balanceMinutes ?? 0);

      bankMinutes = totalWithoutToday + todayAdjusted;
    } else {
      bankMinutes = 0;
    }

    // Dados para os últimos 7 dias (trabalhadas x previstas + saldo do dia)
    const days: { date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      days.push({ date: d });
    }

    trendData = days.map(({ date }) => {
      const key = date.toISOString().slice(0, 10);
      const calc = byDayCalc.get(key);
      const isJustifiedDay = justifiedDays.has(key);
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

      let workedMinutes = 0;
      let expectedMinutes = 0;
      let balanceMinutes = 0;

      if (calc) {
        workedMinutes = calc.workedMinutes ?? 0;
        expectedMinutes = calc.expectedMinutes ?? 0;
        const rawBalance = calc.balanceMinutes ?? 0;
        balanceMinutes = isJustifiedDay
          ? 0
          : isToday && rawBalance < 0
          ? 0
          : rawBalance;
      } else {
        // sem cálculo, tratamos como dia sem marcação
        expectedMinutes = date.getDay() === 0 ? 0 : 8 * 60;
        workedMinutes = 0;
        balanceMinutes = 0; // gráfico mostra apenas horas reais; débito entra no card consolidado
      }

      return {
        label: date.toLocaleDateString("pt-BR", { day: "2-digit" }),
        workedMinutes,
        expectedMinutes,
        balanceMinutes,
      };
    });
  }

  const now = new Date();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const formattedDate = now.toLocaleDateString("pt-BR");

  const bankMinutesLabel = bankMinutes ?? 0;
  const bankIsPositive = bankMinutesLabel >= 0;

  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-ponto-surface via-slate-50 to-ponto-surface">
      <div className="relative z-10 py-4 sm:py-8 lg:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-2 sm:px-4 lg:px-0">
          {/* Banner principal com clima, hoje e banco de horas */}
          <Card className="mt-4 overflow-hidden border-ponto-border-soft bg-gradient-to-r from-ponto-orange-muted via-white to-sky-50 shadow-lux backdrop-blur">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <AppWelcomeHero name={user?.name ?? ""} />
                <div className="flex flex-wrap gap-2 text-xs text-ponto-muted">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 font-medium text-ponto-black shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-ponto-orange" />
                    <span className="capitalize">
                      {weekday}, {formattedDate}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 font-medium text-ponto-black shadow-sm">
                    <CloudSun className="h-3.5 w-3.5 text-sky-500" />
                    Dia parcialmente nublado
                  </span>
                </div>
              </div>

              <div className="mt-2 flex w-full max-w-xs flex-col gap-3 rounded-2xl bg-white/80 p-4 text-xs text-ponto-muted shadow-md sm:mt-0">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ponto-muted-soft">
                    <Clock className="h-3.5 w-3.5 text-ponto-orange" />
                    Banco de horas
                  </span>
                  <span className="rounded-full bg-ponto-surface px-2 py-0.5 text-[10px] font-medium text-ponto-muted">
                    Consolidado
                  </span>
                </div>
                <p
                  className={`text-2xl font-semibold ${
                    bankIsPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {bankIsPositive ? "+" : "-"}
                  {Math.floor(Math.abs(bankMinutesLabel) / 60)}h{" "}
                  {Math.abs(bankMinutesLabel) % 60}min
                </p>
                <p>
                  Verde = horas a favor. Vermelho = horas a compensar. Revise seu saldo antes do
                  fechamento.
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Link href="/app/ponto">
                    <span className="inline-flex items-center gap-2 rounded-full bg-ponto-orange px-3 py-1.5 text-[11px] font-medium text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all cursor-pointer">
                      Registrar ponto agora
                    </span>
                  </Link>
                  <Link href="/app/banco-horas">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer">
                      Ver detalhes do banco de horas
                    </span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linha principal: gráfico + painel de pendências */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
            <Card className="border-ponto-border-soft bg-white/90 shadow-lux backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-ponto-border/30 pb-3">
                <CardTitle className="text-sm font-semibold text-ponto-muted flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ponto-orange" />
                  Tendência recente do seu banco de horas
                </CardTitle>
                <span className="rounded-full bg-ponto-surface px-3 py-1 text-[11px] font-medium text-ponto-muted">
                  Últimos 7 dias
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                {trendData.length > 0 ? (
                  <BankHoursTrendChart data={trendData} />
                ) : (
                  <p className="text-xs text-ponto-muted">
                    Comece a registrar seus pontos para visualizar a evolução do saldo de banco de horas.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-ponto-border-soft bg-white/90 shadow-lux backdrop-blur">
              <CardHeader className="border-b border-ponto-border/40 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-ponto-muted">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Pendências do dia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs text-ponto-muted">
                <p>
                  <span className="font-semibold text-ponto-black">
                    {pendingAdjustments}
                  </span>{" "}
                  ajustes aguardando análise.
                </p>
                <p>
                  Revise seus registros e, se algo estiver incorreto, use o botão{" "}
                  <span className="font-semibold text-ponto-black">“Ajuste de ponto”</span>{" "}
                  na tela de Banco de Horas ou Espelho.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/app/ajustes">
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-all cursor-pointer">
                      Ver ajustes e justificativas
                    </span>
                  </Link>
                  <Link href="/app/admin/justificativas">
                    <span className="inline-flex items-center gap-2 rounded-full bg-ponto-surface px-3 py-1.5 text-[11px] font-medium text-ponto-muted hover:bg-ponto-border/30 transition-all cursor-pointer">
                      Acesso rápido (admin)
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linha de ações rápidas / resumo diário */}
          <Card className="border-ponto-border-soft bg-white/90 shadow-lux backdrop-blur">
            <CardHeader className="border-b border-ponto-border/40 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-ponto-muted">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Rotina rápida do dia
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4 text-xs text-ponto-muted sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p>
                  Hoje você já realizou{" "}
                  <span className="font-semibold text-ponto-black">{marksToday}</span>{" "}
                  marcações. Dias com registro nos últimos 7 dias:{" "}
                  <span className="font-semibold text-ponto-black">{daysWithMarks}</span>.
                </p>
                <p>
                  Complete o ciclo de entrada, almoço e saída para manter seu espelho sempre correto.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/app/ponto">
                  <span className="inline-flex items-center gap-2 rounded-full bg-ponto-orange px-4 py-2 text-[11px] font-medium text-white shadow-sm shadow-ponto-orange/40 hover:bg-ponto-orange/90 hover:shadow-md hover:shadow-ponto-orange/50 transition-all cursor-pointer">
                    Registrar ponto agora
                  </span>
                </Link>
                <Link href="/app/banco-horas">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer">
                    Ver banco de horas
                  </span>
                </Link>
                <Link href="/app/espelho">
                  <span className="inline-flex items-center gap-2 rounded-full bg-ponto-surface px-4 py-2 text-[11px] font-medium text-ponto-muted hover:bg-ponto-border/30 transition-all cursor-pointer">
                    Conferir espelho
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
