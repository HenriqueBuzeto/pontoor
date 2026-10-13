import { NextRequest } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentTenantId } from "@/lib/auth/get-tenant";
import { getTenantById } from "@/lib/repositories/tenants";
import { listTimeEntriesByTenant } from "@/lib/repositories/time-entry";
import { listDailyCalculationsByTenant } from "@/lib/repositories/time-calculations";

const TZ = "America/Sao_Paulo";

function formatTimeSP(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateSP(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function dateKeySP(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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
  const employeeId = (search.get("employeeId") ?? "").trim();

  if (!tipo || !mes || !ano) {
    return new Response("Parâmetros inválidos.", { status: 400 });
  }

  const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const end = new Date(ano, mes, 0, 23, 59, 59, 999);
  const periodoLabel = format(start, "MMM yyyy", { locale: ptBR });

  const fileBaseName = `relatorio-${tipo}-${String(mes).padStart(2, "0")}-${ano}`;

  const [tenant] = await Promise.all([getTenantById(tenantId)]);
  const tenantName = tenant?.name ?? "Empresa";

  const renderSignaturesBlock = (employeeInfo?: { name?: string | null; registration?: string | null }) => {
    const empName = employeeInfo?.name ? employeeInfo.name : "Colaborador";
    const reg = employeeInfo?.registration ? ` (Matrícula: ${employeeInfo.registration})` : "";
    return `
      <section class="signatures-wrapper">
        <p class="signatures-statement">
          Declaro para os devidos fins que as informações e marcações constantes neste relatório refletem com exatidão a jornada e a frequência do período correspondente.
        </p>
        <div class="signatures-grid">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-role">Assinatura do Colaborador</div>
            <div class="sig-name">${empName}${reg}</div>
            <div class="sig-date">Data: ____/____/________</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-role">Gestor / Recursos Humanos</div>
            <div class="sig-name">${tenantName}</div>
            <div class="sig-date">Data: ____/____/________</div>
          </div>
        </div>
      </section>
    `;
  };

  if (tipo === "marcacoes") {
    const rows = await listTimeEntriesByTenant(tenantId, start, end, {
      limit: 5000,
      employeeId: employeeId || undefined,
    });

    const singleEmployee = rows.length > 0 && rows.every((r) => r.employeeId === rows[0].employeeId) ? rows[0] : null;
    const employeeInfo = singleEmployee
      ? { name: singleEmployee.employeeName, registration: singleEmployee.registration }
      : undefined;

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
          const data = formatDateSP(occurred);
          const hora = formatTimeSP(occurred);
          const tipoLabelMap: Record<string, string> = {
            clock_in: "Entrada",
            clock_out: "Saída",
            break_start: "Saída almoço",
            break_end: "Retorno almoço",
            pause_start: "Saída meio expediente",
            pause_end: "Retorno meio expediente",
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
    .signatures-wrapper { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db; page-break-inside: avoid; break-inside: avoid; }
    .signatures-statement { font-size: 11px; color: #4b5563; margin-bottom: 24px; line-height: 1.5; font-style: italic; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #111827; margin-bottom: 8px; }
    .sig-role { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; }
    .sig-name { font-size: 11px; color: #374151; margin-top: 2px; }
    .sig-date { font-size: 10px; color: #6b7280; margin-top: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .signatures-wrapper { page-break-inside: avoid; break-inside: avoid; }
    }
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
      ${renderSignaturesBlock(employeeInfo)}
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
      const data = formatDateSP(occurred);
      const hora = formatTimeSP(occurred);
      const tipoLabelMap: Record<string, string> = {
        clock_in: "Entrada",
        clock_out: "Saída",
        break_start: "Saída almoço",
        break_end: "Retorno almoço",
        pause_start: "Saída meio expediente",
        pause_end: "Retorno meio expediente",
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
    const calcRows = await listDailyCalculationsByTenant(tenantId, ano, mes, {
      limit: 5000,
      employeeId: employeeId || undefined,
    });
    const filtered =
      tipo === "atrasos"
        ? calcRows.filter((r) => (r.lateMinutes ?? 0) > 0 || (r.earlyLeaveMinutes ?? 0) > 0)
        : calcRows.filter((r) => (r.overtimeMinutes ?? 0) > 0);

    const singleEmployee = filtered.length > 0 && filtered.every((r) => r.employeeId === filtered[0].employeeId) ? filtered[0] : null;
    const employeeInfo = singleEmployee
      ? { name: singleEmployee.employeeName, registration: singleEmployee.registration }
      : undefined;

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
    .signatures-wrapper { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db; page-break-inside: avoid; break-inside: avoid; }
    .signatures-statement { font-size: 11px; color: #4b5563; margin-bottom: 24px; line-height: 1.5; font-style: italic; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #111827; margin-bottom: 8px; }
    .sig-role { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; }
    .sig-name { font-size: 11px; color: #374151; margin-top: 2px; }
    .sig-date { font-size: 10px; color: #6b7280; margin-top: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .signatures-wrapper { page-break-inside: avoid; break-inside: avoid; }
    }
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
      ${renderSignaturesBlock(employeeInfo)}
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
    const rows = await listTimeEntriesByTenant(tenantId, start, end, {
      limit: 5000,
      employeeId: employeeId || undefined,
    });

    const singleEmployee = rows.length > 0 && rows.every((r) => r.employeeId === rows[0].employeeId) ? rows[0] : null;
    const employeeInfo = singleEmployee
      ? { name: singleEmployee.employeeName, registration: singleEmployee.registration }
      : undefined;

    if (formato === "html") {
      const headerHtml = `
        <header style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827;">Espelho de ponto</div>
            <div style="font-size:12px;color:#6b7280;">Período: ${periodoLabel}</div>
            ${
              singleEmployee
                ? `<div style="font-size:12px;color:#374151;margin-top:2px;">Colaborador: <strong>${singleEmployee.employeeName ?? "—"}</strong> (Matrícula: ${singleEmployee.registration ?? "—"})</div>`
                : ""
            }
          </div>
          <div style="font-size:11px;color:#9ca3af;">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })}</div>
        </header>
      `;

      type DayBucket = {
        date: Date;
        items: typeof rows;
      };

      const byEmployee = new Map<
        string,
        {
          employeeName: string | null;
          registration: string | null;
          days: Map<string, DayBucket>;
        }
      >();

      for (const r of rows) {
        const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
        const keyDate = dateKeySP(occurred);

        if (!byEmployee.has(r.employeeId)) {
          byEmployee.set(r.employeeId, {
            employeeName: r.employeeName ?? null,
            registration: r.registration ?? null,
            days: new Map(),
          });
        }

        const emp = byEmployee.get(r.employeeId)!;
        if (!emp.days.has(keyDate)) {
          emp.days.set(keyDate, { date: occurred, items: [] });
        }
        emp.days.get(keyDate)!.items.push(r);
      }

      const employeesArray = Array.from(byEmployee.entries()).sort(([, a], [, b]) => {
        const nameA = (a.employeeName ?? "").toLocaleLowerCase();
        const nameB = (b.employeeName ?? "").toLocaleLowerCase();
        return nameA.localeCompare(nameB, "pt-BR");
      });

      const tablesHtml = employeesArray
        .map(([, emp]) => {
          const daysArray = Array.from(emp.days.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

          const rowsHtml = daysArray
            .map((d) => {
              const sorted = [...d.items].sort((a, b) => {
                const da = a.occurredAt instanceof Date ? a.occurredAt : new Date(a.occurredAt as unknown as string);
                const db = b.occurredAt instanceof Date ? b.occurredAt : new Date(b.occurredAt as unknown as string);
                return da.getTime() - db.getTime();
              });

              let entrada: Date | null = null;
              let saidaAlmoco: Date | null = null;
              let retornoAlmoco: Date | null = null;
              let saidaMeio: Date | null = null;
              let voltaMeio: Date | null = null;
              let saida: Date | null = null;

              for (const r of sorted) {
                const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
                if (r.type === "clock_in" && !entrada) entrada = occurred;
                if (r.type === "break_start" && !saidaAlmoco) saidaAlmoco = occurred;
                if (r.type === "break_end" && !retornoAlmoco) retornoAlmoco = occurred;
                if (r.type === "pause_start" && !saidaMeio) saidaMeio = occurred;
                if (r.type === "pause_end" && !voltaMeio) voltaMeio = occurred;
                if (r.type === "clock_out") saida = occurred;
              }

              const diaLabel = formatDateSP(d.date);

              return `
                <tr>
                  <td>${diaLabel}</td>
                  <td>${formatTimeSP(entrada)}</td>
                  <td>${formatTimeSP(saidaAlmoco)}</td>
                  <td>${formatTimeSP(retornoAlmoco)}</td>
                  <td>${formatTimeSP(saidaMeio)}</td>
                  <td>${formatTimeSP(voltaMeio)}</td>
                  <td>${formatTimeSP(saida)}</td>
                  <td style="text-align:center;">${sorted.length}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <div style="margin-bottom:28px;">
              ${
                !singleEmployee
                  ? `<div style="margin-bottom:8px;font-weight:600;font-size:13px;color:#111827;">${emp.employeeName ?? "—"} <span style="font-size:11px;color:#6b7280;font-weight:normal;">(Matrícula: ${emp.registration ?? "—"})</span></div>`
                  : ""
              }
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entrada</th>
                    <th>Saída almoço</th>
                    <th>Retorno almoço</th>
                    <th>Saída meio exp.</th>
                    <th>Volta meio exp.</th>
                    <th>Saída</th>
                    <th style="text-align:center;">Marcações</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
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
    tfoot { font-size:11px; color:#9ca3af; background:#f9fafb; }
    .signatures-wrapper { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db; page-break-inside: avoid; break-inside: avoid; }
    .signatures-statement { font-size: 11px; color: #4b5563; margin-bottom: 24px; line-height: 1.5; font-style: italic; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #111827; margin-bottom: 8px; }
    .sig-role { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; }
    .sig-name { font-size: 11px; color: #374151; margin-top: 2px; }
    .sig-date { font-size: 10px; color: #6b7280; margin-top: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .signatures-wrapper { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    <main style="padding:16px 24px 20px 24px;">
      ${tablesHtml}
      <div style="font-size:11px;color:#9ca3af;margin-top:8px;">Total geral de batidas registradas: ${rows.length}</div>
      ${renderSignaturesBlock(employeeInfo)}
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

    // CSV Estruturado nível sênior
    const header = [
      "Colaborador",
      "Matrícula",
      "Data",
      "Entrada",
      "Saída almoço",
      "Retorno almoço",
      "Saída meio exp.",
      "Volta meio exp.",
      "Saída",
      "Total marcações",
    ].join(";");

    type DayBucket = {
      date: Date;
      items: typeof rows;
    };

    const byEmployee = new Map<
      string,
      {
        employeeName: string | null;
        registration: string | null;
        days: Map<string, DayBucket>;
      }
    >();

    for (const r of rows) {
      const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
      const keyDate = dateKeySP(occurred);

      if (!byEmployee.has(r.employeeId)) {
        byEmployee.set(r.employeeId, {
          employeeName: r.employeeName ?? null,
          registration: r.registration ?? null,
          days: new Map(),
        });
      }

      const emp = byEmployee.get(r.employeeId)!;
      if (!emp.days.has(keyDate)) {
        emp.days.set(keyDate, { date: occurred, items: [] });
      }
      emp.days.get(keyDate)!.items.push(r);
    }

    const csvLines: string[] = [header];

    const employeesArray = Array.from(byEmployee.entries()).sort(([, a], [, b]) => {
      const nameA = (a.employeeName ?? "").toLocaleLowerCase();
      const nameB = (b.employeeName ?? "").toLocaleLowerCase();
      return nameA.localeCompare(nameB, "pt-BR");
    });

    for (const [, emp] of employeesArray) {
      const daysArray = Array.from(emp.days.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const d of daysArray) {
        const sorted = [...d.items].sort((a, b) => {
          const da = a.occurredAt instanceof Date ? a.occurredAt : new Date(a.occurredAt as unknown as string);
          const db = b.occurredAt instanceof Date ? b.occurredAt : new Date(b.occurredAt as unknown as string);
          return da.getTime() - db.getTime();
        });

        let entrada: Date | null = null;
        let saidaAlmoco: Date | null = null;
        let retornoAlmoco: Date | null = null;
        let saidaMeio: Date | null = null;
        let voltaMeio: Date | null = null;
        let saida: Date | null = null;

        for (const r of sorted) {
          const occurred = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt as unknown as string);
          if (r.type === "clock_in" && !entrada) entrada = occurred;
          if (r.type === "break_start" && !saidaAlmoco) saidaAlmoco = occurred;
          if (r.type === "break_end" && !retornoAlmoco) retornoAlmoco = occurred;
          if (r.type === "pause_start" && !saidaMeio) saidaMeio = occurred;
          if (r.type === "pause_end" && !voltaMeio) voltaMeio = occurred;
          if (r.type === "clock_out") saida = occurred;
        }

        const dataStr = formatDateSP(d.date);
        const fmt = (val: Date | null) => (val ? formatTimeSP(val) : "");

        const line = [
          emp.employeeName ?? "—",
          emp.registration ?? "—",
          dataStr,
          fmt(entrada),
          fmt(saidaAlmoco),
          fmt(retornoAlmoco),
          fmt(saidaMeio),
          fmt(voltaMeio),
          fmt(saida),
          sorted.length.toString(),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";");

        csvLines.push(line);
      }
    }

    const csv = csvLines.join("\r\n");
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

