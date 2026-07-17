"use client";

import type { ItemHistorico } from "@/lib/historico/consulta";
import { formatBRL, formatData } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useCorrecaoInline } from "./useCorrecaoInline";

export interface HistoryRowProps {
  item: ItemHistorico;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

export function HistoryRow({ item, categorias, subcategoriasPorCategoria, objetivos }: HistoryRowProps) {
  const {
    categoriaId,
    subcategoriaId,
    objetivoId,
    pendente,
    erro,
    desvio,
    aoTrocarCategoria,
    aoTrocarSubcategoria,
    aoTrocarObjetivo,
    resolverSoEste,
    resolverTodosPassados,
    resolverNovaRegra,
    cancelarDesvio,
  } = useCorrecaoInline(item);

  const subcategorias = categoriaId ? subcategoriasPorCategoria[categoriaId] ?? [] : [];

  return (
    <li className="flex flex-col gap-1.5 border-b border-border-subtle py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-base text-text-primary">{item.fornecedorOriginal}</span>
          <span className="font-mono-nums text-sm text-text-muted">{formatData(item.data)}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoriaId}
            disabled={pendente}
            onChange={(e) => aoTrocarCategoria(e.target.value)}
            className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary"
          >
            <option value="">Categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <select
            value={subcategoriaId}
            disabled={pendente || subcategorias.length === 0}
            onChange={(e) => aoTrocarSubcategoria(e.target.value)}
            className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary disabled:opacity-50"
          >
            <option value="">Subcategoria</option>
            {subcategorias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
          <select
            value={objetivoId}
            disabled={pendente}
            onChange={(e) => aoTrocarObjetivo(e.target.value)}
            className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary"
          >
            <option value="">Objetivo</option>
            {objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <span className="w-24 shrink-0 text-right font-mono-nums text-base text-text-primary">{formatBRL(item.valor)}</span>
        </div>
      </div>

      {erro && <p className="text-sm text-terra">{erro}</p>}

      {desvio && (
        <div className="flex flex-col gap-2 rounded-card bg-indigo-tint p-2.5 text-sm">
          <span className="text-text-secondary">
            Esse fornecedor costuma ser <strong>{desvio.categoriaAtualRotulo}</strong>. O que você quer fazer?
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" disabled={pendente} onClick={resolverSoEste}>
              Só este
            </Button>
            <Button variant="secondary" size="sm" disabled={pendente} onClick={resolverTodosPassados}>
              Todos os passados
            </Button>
            <Button variant="primary" size="sm" disabled={pendente} onClick={resolverNovaRegra}>
              Nova regra
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelarDesvio}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
