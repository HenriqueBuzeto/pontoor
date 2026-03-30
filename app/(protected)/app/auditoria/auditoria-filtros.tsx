"use client";

const ENTITIES = [
  { value: "", label: "Todas" },
  { value: "user", label: "Usuário" },
  { value: "employee", label: "Colaborador" },
  { value: "time_entry", label: "Marcação" },
  { value: "adjustment", label: "Ajuste" },
];

export function AuditoriaFiltros({ entity }: { entity: string }) {
  return (
    <form method="get" action="/app/auditoria" className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ponto-muted">Entidade</label>
        <select
          name="entity"
          defaultValue={entity}
          className="h-10 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
        >
          {ENTITIES.map((e) => (
            <option key={e.value || "all"} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-ponto-border bg-ponto-surface px-4 text-sm font-medium hover:bg-ponto-border/30"
      >
        Filtrar
      </button>
    </form>
  );
}
