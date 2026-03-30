import { NextRequest } from "next/server";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listTimeEntriesByTenant } from "@/lib/repositories/time-entry";

const ENTRY_LABEL: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_start: "Início intervalo",
  break_end: "Fim intervalo",
  pause_start: "Pausa início",
  pause_end: "Pausa fim",
};

export async function GET(req: NextRequest) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return new Response("Sem tenant.", { status: 401 });

  const search = req.nextUrl.searchParams;
  const employeeId = search.get("employeeId") ?? "";
  const month = Number(search.get("mes") ?? "0");
  const year = Number(search.get("ano") ?? "0");
  if (!month || !year) return new Response("Parâmetros inválidos.", { status: 400 });

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const entries = await listTimeEntriesByTenant(tenantId, start, end, {
    employeeId: employeeId || undefined,
    limit: 10000,
  });

  const header = ["Colaborador", "Matrícula", "Data", "Hora", "Tipo", "Origem"].join(";");
  const rows = entries.map((e) => {
    const d = new Date(e.occurredAt);
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return [
      e.employeeName ?? "",
      e.registration ?? "",
      data,
      hora,
      ENTRY_LABEL[e.type] ?? e.type,
      e.source ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";");
  });

  const csv = [header, ...rows].join("\r\n");
  const fileName = `relatorio-marcacoes-${String(month).padStart(2, "0")}-${year}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

