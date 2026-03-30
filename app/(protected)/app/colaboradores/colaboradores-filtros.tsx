"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type Props = { q: string; status: string; total: number };

export function ColaboradoresFiltros({ q, status, total }: Props) {
  return (
    <form
      method="get"
      action="/app/colaboradores"
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="page" value="1" />
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ponto-muted" />
        <Input
          name="q"
          placeholder="Buscar por nome ou matrícula..."
          defaultValue={q}
          className="pl-9"
        />
      </div>
      <select
        name="status"
        defaultValue={status}
        className="h-10 rounded-md border border-ponto-border bg-ponto-white px-3 text-sm"
      >
        <option value="all">Todos os status</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
        <option value="on_leave">Afastado</option>
      </select>
      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
      <span className="text-sm text-ponto-muted">{total} resultado(s)</span>
    </form>
  );
}
