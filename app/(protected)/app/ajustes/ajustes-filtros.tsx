"use client";

export function AjustesFiltros({ status }: { status: string }) {
  return (
    <form method="get" action="/app/ajustes" className="flex flex-wrap items-end gap-3">
      <select
        name="status"
        defaultValue={status}
        className="h-10 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
      >
        <option value="all">Todos</option>
        <option value="pending">Pendente</option>
        <option value="approved">Aprovado</option>
        <option value="rejected">Rejeitado</option>
      </select>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-ponto-border bg-ponto-surface px-4 text-sm font-medium hover:bg-ponto-border/30"
      >
        Filtrar
      </button>
    </form>
  );
}
