import { NextRequest } from "next/server";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listEmployees } from "@/lib/repositories/employees";
import { listTimeEntriesByEmployee } from "@/lib/repositories/time-entry";

export async function GET(req: NextRequest) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return new Response("Sem tenant.", { status: 401 });
  }

  const search = req.nextUrl.searchParams;
  const employeeId = search.get("employeeId") ?? "";
  const month = Number(search.get("month") ?? "0");
  const year = Number(search.get("year") ?? "0");

  if (!employeeId || !month || !year) {
    return new Response("Parâmetros inválidos.", { status: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [{ list: employees }, entries] = await Promise.all([
    listEmployees(tenantId, { page: 1, status: "active" }),
    listTimeEntriesByEmployee(tenantId, employeeId, start, end),
  ] as const);

  const emp = employees.find((e) => e.id === employeeId);
  const header = [
    "Colaborador",
    "Matrícula",
    "Data",
    "Hora",
    "Tipo",
  ].join(";");

  const rows = entries.map((e) => {
    const d = new Date(e.occurredAt);
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return [
      emp?.name ?? "",
      emp?.registration ?? "",
      data,
      hora,
      e.type,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";");
  });

  const csv = [header, ...rows].join("\r\n");
  const fileName = `espelho-${emp?.registration ?? "colaborador"}-${String(
    month
  ).padStart(2, "0")}-${year}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

