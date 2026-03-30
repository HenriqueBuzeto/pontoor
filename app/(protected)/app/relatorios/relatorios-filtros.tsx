"use client";

const TIPOS = [
  { value: "", label: "Selecione o tipo" },
  { value: "espelho", label: "Espelho de ponto" },
  { value: "marcacoes", label: "Marcações" },
  { value: "atrasos", label: "Atrasos" },
  { value: "horas_extras", label: "Horas extras" },
];

export function RelatoriosFiltros({
  tipo,
  mes,
  ano,
}: { tipo: string; mes: string; ano: string }) {
  const currentYear = new Date().getFullYear();
  return (
    <form method="get" action="/app/relatorios" className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Tipo</label>
        <select
          name="tipo"
          defaultValue={tipo}
          className="h-10 min-w-[180px] rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t.value || "x"} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Mês</label>
        <select
          name="mes"
          defaultValue={mes}
          className="h-10 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        >
          <option value="">—</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Ano</label>
        <input
          type="number"
          name="ano"
          defaultValue={ano || currentYear}
          min={2020}
          max={2030}
          className="h-10 w-24 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-ponto-border bg-ponto-surface px-4 text-sm font-medium hover:bg-ponto-border/30"
      >
        Gerar
      </button>
    </form>
  );
}
