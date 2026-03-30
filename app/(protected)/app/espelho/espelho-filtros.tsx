"use client";

type Employee = { id: string; name: string; registration: string };

export function EspelhoFiltros({
  employees,
  selectedEmployeeId,
  month,
  year,
}: {
  employees: Employee[];
  selectedEmployeeId: string;
  month: number;
  year: number;
}) {
  return (
    <form method="get" action="/app/espelho" className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Colaborador</label>
        <select
          name="employeeId"
          defaultValue={selectedEmployeeId}
          className="h-10 min-w-[200px] rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        >
          <option value="">Selecione</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.registration})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Mês</label>
        <select
          name="month"
          defaultValue={String(month)}
          className="h-10 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        >
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
          name="year"
          defaultValue={year}
          min={2020}
          max={2030}
          className="h-10 w-24 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-ponto-border bg-ponto-surface px-4 text-sm font-medium hover:bg-ponto-border/30"
      >
        Buscar
      </button>
    </form>
  );
}
