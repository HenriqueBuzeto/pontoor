import { NextRequest } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { listTimeEntriesByTenant } from "@/lib/repositories/time-entry";
import { listDailyCalculationsByTenant } from "@/lib/repositories/time-calculations";

function formatMinutesLabel(m: number) {
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  if (!h && !min) return "0min";
  if (!h) return `${sign}${min}min`;
  if (!min) return `${sign}${h}h`;
  return `${sign}${h}h ${min}min`;
}

export async function GET(req: NextRequest) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return new Response("Sem tenant.", { status: 401 });

  const search = req.nextUrl.searchParams;
  const tipo = search.get("tipo") ?? "";
  const mes = Number(search.get("mes") ?? "0");
  const ano = Number(search.get("ano") ?? "0");
  const formato = (search.get("formato") ?? "csv").toLowerCase();

  if (!tipo || !mes || !ano) {
    return new Response("Parâmetros inválidos.", { status: 400 });
  }

  const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const end = new Date(ano, mes, 0, 23, 59, 59, 999);
  const periodoLabel = format(start, "MMM yyyy", { locale: ptBR });

  const fileBaseName = `relatorio-${tipo}-${String(mes).padStart(2, "0")}-${ano}`;

  if (tipo === "marcacoes") {
    const rows = await listTimeEntriesByTenant(tenantId, start, end, { limit: 5000 });

    if (formato === "html") {
      const headerHtml = `
        <header style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827;">Relatório de Marcações</div>
            <div style="font-size:12px;color:#6b7280;">Período: ${periodoLabel}</div>
          </div>
          <div style="font-size:11px;color:#9ca3af;">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })}</div>
        </header>
      `;

      const bodyRows = rows
        .map((r) => {
          const occurred =
            r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
          const data = format(occurred, "dd/MM/yyyy", { locale: ptBR });
          const hora = format(occurred, "HH:mm", { locale: ptBR });
          const tipoLabelMap: Record<string, string> = {
            clock_in: "Entrada",
            clock_out: "Saída",
            break_start: "Saída almoço",
            break_end: "Retorno almoço",
          };
          const tipoLabel = tipoLabelMap[r.type] ?? r.type;
          const origem = r.source === "manual_adjustment" ? "Ajuste manual" : r.source ?? "—";

          return `
            <tr>
              <td>${data}</td>
              <td>${hora}</td>
              <td>${r.employeeName ?? "—"}</td>
              <td>${r.registration ?? "—"}</td>
              <td>${tipoLabel}</td>
              <td>${origem}</td>
            </tr>
          `;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>Relatório de Marcações</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f9fafb; color:#111827; margin:0; padding:24px; }
    .container { max-width: 960px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,0.12); overflow:hidden; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead { background:#f3f4f6; }
    th, td { padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; }
    tfoot { font-size:11px; color:#9ca3af; background:#f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    <main style="padding:16px 24px 20px 24px;">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Hora</th>
            <th>Colaborador</th>
            <th>Matrícula</th>
            <th>Tipo</th>
            <th>Origem</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6">Total de marcações: ${rows.length}</td>
          </tr>
        </tfoot>
      </table>
    </main>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileBaseName}.html"`,
        },
      });
    }

    // CSV (abre normalmente no Excel)
    const header = ["Data", "Hora", "Colaborador", "Matrícula", "Tipo", "Origem"].join(";");
    const csvRows = rows.map((r) => {
      const occurred =
        r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
      const data = format(occurred, "dd/MM/yyyy", { locale: ptBR });
      const hora = format(occurred, "HH:mm", { locale: ptBR });
      const tipoLabelMap: Record<string, string> = {
        clock_in: "Entrada",
        clock_out: "Saída",
        break_start: "Saída almoço",
        break_end: "Retorno almoço",
      };
      const tipoLabel = tipoLabelMap[r.type] ?? r.type;
      const origem = r.source === "manual_adjustment" ? "Ajuste manual" : r.source ?? "—";
      return [data, hora, r.employeeName ?? "—", r.registration ?? "—", tipoLabel, origem]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    });

    const csv = [header, ...csvRows].join("\r\n");
    const fileName = `${fileBaseName}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  if (tipo === "atrasos" || tipo === "horas_extras") {
    const calcRows = await listDailyCalculationsByTenant(tenantId, ano, mes, { limit: 5000 });
    const filtered =
      tipo === "atrasos"
        ? calcRows.filter((r) => (r.lateMinutes ?? 0) > 0 || (r.earlyLeaveMinutes ?? 0) > 0)
        : calcRows.filter((r) => (r.overtimeMinutes ?? 0) > 0);

    if (formato === "html") {
      const title =
        tipo === "atrasos" ? "Relatório de Atrasos" : "Relatório de Horas Extras";

      const headerHtml = `
        <header style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827;">${title}</div>
            <div style="font-size:12px;color:#6b7280;">Período: ${periodoLabel}</div>
          </div>
          <div style="font-size:11px;color:#9ca3af;">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })}</div>
        </header>
      `;

      const bodyRows = filtered
        .map((r) => {
          const rawDate = r.date as unknown;
          const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
          const dataLabel = format(dt, "dd/MM/yyyy", { locale: ptBR });
          const late = r.lateMinutes ?? 0;
          const early = r.earlyLeaveMinutes ?? 0;
          const overtime = r.overtimeMinutes ?? 0;
          const totalAtraso = late + early;

          return `
            <tr>
              <td>${dataLabel}</td>
              <td>${r.employeeName ?? "Colaborador"}</td>
              <td>${r.registration ?? "—"}</td>
              <td>${tipo === "atrasos" ? formatMinutesLabel(late) : formatMinutesLabel(overtime)}</td>
              <td>${tipo === "atrasos" ? formatMinutesLabel(early) : formatMinutesLabel(r.balanceMinutes ?? 0)}</td>
              ${
                tipo === "atrasos"
                  ? `<td>${formatMinutesLabel(totalAtraso)}</td>`
                  : ""
              }
            </tr>
          `;
        })
        .join("");

      const extraHeader =
        tipo === "atrasos"
          ? `<th>Atraso entrada</th><th>Saída antecipada</th><th>Total atraso</th>`
          : `<th>Horas extras</th><th>Saldo do dia</th>`;

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f9fafb; color:#111827; margin:0; padding:24px; }
    .container { max-width: 960px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,0.12); overflow:hidden; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead { background:#f3f4f6; }
    th, td { padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; }
    tfoot { font-size:11px; color:#9ca3af; background:#f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    <main style="padding:16px 24px 20px 24px;">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Colaborador</th>
            <th>Matrícula</th>
            ${extraHeader}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </main>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileBaseName}.html"`,
        },
      });
    }

    // CSV para atrasos / horas extras
    const header =
      tipo === "atrasos"
        ? ["Data", "Colaborador", "Matrícula", "Atraso entrada", "Saída antecipada", "Total atraso"].join(";")
        : ["Data", "Colaborador", "Matrícula", "Horas extras", "Saldo do dia"].join(";");

    const csvRows = filtered.map((r) => {
      const rawDate = r.date as unknown;
      const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string);
      const dataLabel = format(dt, "dd/MM/yyyy", { locale: ptBR });
      const late = r.lateMinutes ?? 0;
      const early = r.earlyLeaveMinutes ?? 0;
      const overtime = r.overtimeMinutes ?? 0;
      const totalAtraso = late + early;

      const base = [dataLabel, r.employeeName ?? "Colaborador", r.registration ?? "—"];

      const extra =
        tipo === "atrasos"
          ? [formatMinutesLabel(late), formatMinutesLabel(early), formatMinutesLabel(totalAtraso)]
          : [formatMinutesLabel(overtime), formatMinutesLabel(r.balanceMinutes ?? 0)];

      return [...base, ...extra]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    });

    const csv = [header, ...csvRows].join("\r\n");
    const fileName = `${fileBaseName}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  // Espelho: exporta resumo diário por colaborador em CSV/HTML simples
  if (tipo === "espelho") {
    const rows = await listTimeEntriesByTenant(tenantId, start, end, { limit: 5000 });

    if (formato === "html") {
      const headerHtml = `
        <header style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827;">Espelho de ponto</div>
            <div style="font-size:12px;color:#6b7280;">Período: ${periodoLabel}</div>
          </div>
          <div style="font-size:11px;color:#9ca3af;">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })}</div>
        </header>
      `;

      // Para simplificar, listamos uma linha por marcação (igual tela principal do relatório)
      const bodyRows = rows
        .map((r) => {
          const occurred =
            r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
          const data = format(occurred, "dd/MM/yyyy", { locale: ptBR });
          const hora = format(occurred, "HH:mm", { locale: ptBR });
          const tipoLabelMap: Record<string, string> = {
            clock_in: "Entrada",
            clock_out: "Saída",
            break_start: "Saída almoço",
            break_end: "Retorno almoço",
          };
          const tipoLabel = tipoLabelMap[r.type] ?? r.type;

          return `
            <tr>
              <td>${data}</td>
              <td>${hora}</td>
              <td>${r.employeeName ?? "—"}</td>
              <td>${r.registration ?? "—"}</td>
              <td>${tipoLabel}</td>
            </tr>
          `;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charSet="utf-8" />
  <title>Espelho de ponto</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f9fafb; color:#111827; margin:0; padding:24px; }
    .container { max-width: 960px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,0.12); overflow:hidden; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead { background:#f3f4f6; }
    th, td { padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:left; }
    th { font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    <main style="padding:16px 24px 20px 24px;">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Hora</th>
            <th>Colaborador</th>
            <th>Matrícula</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </main>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileBaseName}.html"`,
        },
      });
    }

    const header = ["Data", "Hora", "Colaborador", "Matrícula", "Tipo"].join(";");
    const csvRows = rows.map((r) => {
      const occurred =
        r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
      const data = format(occurred, "dd/MM/yyyy", { locale: ptBR });
      const hora = format(occurred, "HH:mm", { locale: ptBR });
      const tipoLabelMap: Record<string, string> = {
        clock_in: "Entrada",
        clock_out: "Saída",
        break_start: "Saída almoço",
        break_end: "Retorno almoço",
      };
      const tipoLabel = tipoLabelMap[r.type] ?? r.type;
      return [data, hora, r.employeeName ?? "—", r.registration ?? "—", tipoLabel]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    });

    const csv = [header, ...csvRows].join("\r\n");
    const fileName = `${fileBaseName}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  return new Response("Tipo de relatório não suportado para exportação.", { status: 400 });
}

