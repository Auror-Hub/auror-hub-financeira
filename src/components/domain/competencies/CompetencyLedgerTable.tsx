"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ItemHistorico } from "@/lib/historico/consulta";
import { formatBRL, formatData } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCorrecaoInline } from "@/components/domain/historico/useCorrecaoInline";

export interface CompetencyLedgerTableProps {
  lancamentos: ItemHistorico[];
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

type ColunaOrdenavel = "data" | "fornecedor" | "valor" | "categoria" | "subcategoria" | "objetivo";
type Direcao = "asc" | "desc";

const COLUNAS: { chave: ColunaOrdenavel; rotulo: string; alinhamento: "left" | "right" }[] = [
  { chave: "data", rotulo: "Data", alinhamento: "left" },
  { chave: "fornecedor", rotulo: "Fornecedor", alinhamento: "left" },
  { chave: "valor", rotulo: "Valor", alinhamento: "right" },
  { chave: "categoria", rotulo: "Categoria", alinhamento: "left" },
  { chave: "subcategoria", rotulo: "Subcategoria", alinhamento: "left" },
  { chave: "objetivo", rotulo: "Objetivo", alinhamento: "left" },
];

function comparar(a: ItemHistorico, b: ItemHistorico, coluna: ColunaOrdenavel): number {
  switch (coluna) {
    case "data":
      return a.data.localeCompare(b.data);
    case "fornecedor":
      return a.fornecedorOriginal.localeCompare(b.fornecedorOriginal, "pt-BR");
    case "valor":
      return Math.abs(a.valor) - Math.abs(b.valor);
    case "categoria":
      return (a.categoriaRotulo ?? "").localeCompare(b.categoriaRotulo ?? "", "pt-BR");
    case "subcategoria":
      return (a.subcategoriaRotulo ?? "").localeCompare(b.subcategoriaRotulo ?? "", "pt-BR");
    case "objetivo":
      return (a.objetivoRotulo ?? "").localeCompare(b.objetivoRotulo ?? "", "pt-BR");
  }
}

export function CompetencyLedgerTable({
  lancamentos,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: CompetencyLedgerTableProps) {
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel>("data");
  const [direcao, setDirecao] = useState<Direcao>("desc");
  const [filtroFornecedor, setFiltroFornecedor] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroSubcategoria, setFiltroSubcategoria] = useState("");
  const [filtroObjetivo, setFiltroObjetivo] = useState("");

  function alternarOrdenacao(coluna: ColunaOrdenavel) {
    if (coluna === ordenarPor) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(coluna);
      setDirecao(coluna === "valor" ? "desc" : "asc");
    }
  }

  const subcategoriasDoFiltro = filtroCategoria ? subcategoriasPorCategoria[filtroCategoria] ?? [] : [];

  const visiveis = useMemo(() => {
    const termo = filtroFornecedor.trim().toLowerCase();
    const filtrados = lancamentos.filter((l) => {
      if (termo && !l.fornecedorOriginal.toLowerCase().includes(termo)) return false;
      if (filtroCategoria && l.categoriaId !== filtroCategoria) return false;
      if (filtroSubcategoria && l.subcategoriaId !== filtroSubcategoria) return false;
      if (filtroObjetivo && l.objetivoId !== filtroObjetivo) return false;
      return true;
    });
    const fator = direcao === "asc" ? 1 : -1;
    return [...filtrados].sort((a, b) => comparar(a, b, ordenarPor) * fator);
  }, [lancamentos, filtroFornecedor, filtroCategoria, filtroSubcategoria, filtroObjetivo, ordenarPor, direcao]);

  const totalVisivel = visiveis.reduce((soma, l) => soma + Math.abs(l.valor), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Fornecedor
          <Input
            value={filtroFornecedor}
            onChange={(e) => setFiltroFornecedor(e.target.value)}
            placeholder="Buscar..."
            className="h-[34px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Categoria
          <select
            value={filtroCategoria}
            onChange={(e) => {
              setFiltroCategoria(e.target.value);
              setFiltroSubcategoria("");
            }}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Subcategoria
          <select
            value={filtroSubcategoria}
            onChange={(e) => setFiltroSubcategoria(e.target.value)}
            disabled={subcategoriasDoFiltro.length === 0}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
          >
            <option value="">Todas</option>
            {subcategoriasDoFiltro.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Objetivo
          <select
            value={filtroObjetivo}
            onChange={(e) => setFiltroObjetivo(e.target.value)}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Todos</option>
            {objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        {(filtroFornecedor || filtroCategoria || filtroSubcategoria || filtroObjetivo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltroFornecedor("");
              setFiltroCategoria("");
              setFiltroSubcategoria("");
              setFiltroObjetivo("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <p className="text-sm text-text-muted">
        {visiveis.length} {visiveis.length === 1 ? "lançamento" : "lançamentos"} · {formatBRL(-totalVisivel)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default">
              {COLUNAS.map((coluna) => {
                const ativa = ordenarPor === coluna.chave;
                return (
                  <th
                    key={coluna.chave}
                    className={`py-2 px-2 font-medium text-text-secondary ${coluna.alinhamento === "right" ? "text-right" : "text-left"}`}
                  >
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao(coluna.chave)}
                      className={`inline-flex items-center gap-1 hover:text-text-primary ${coluna.alinhamento === "right" ? "flex-row-reverse" : ""} ${ativa ? "text-text-primary" : ""}`}
                    >
                      {coluna.rotulo}
                      {ativa ? (
                        direcao === "asc" ? (
                          <ArrowUp size={13} strokeWidth={1.75} />
                        ) : (
                          <ArrowDown size={13} strokeWidth={1.75} />
                        )
                      ) : (
                        <ChevronsUpDown size={13} strokeWidth={1.5} className="text-text-muted" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((item) => (
              <LedgerRow
                key={item.lancamentoId}
                item={item}
                categorias={categorias}
                subcategoriasPorCategoria={subcategoriasPorCategoria}
                objetivos={objetivos}
              />
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length} className="py-6 text-center text-base text-text-muted">
                  Nenhum lançamento decidido para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LedgerRow({
  item,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: {
  item: ItemHistorico;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}) {
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
  const selectClass =
    "h-8 w-full rounded-input border border-border-default bg-surface-primary px-1.5 text-sm text-text-primary disabled:opacity-50";

  return (
    <>
      <tr className="border-b border-border-subtle align-middle">
        <td className="whitespace-nowrap py-2 px-2 font-mono-nums text-text-muted">{formatData(item.data)}</td>
        <td className="py-2 px-2 text-text-primary">{item.fornecedorOriginal}</td>
        <td className="whitespace-nowrap py-2 px-2 text-right font-mono-nums text-text-primary">{formatBRL(item.valor)}</td>
        <td className="py-2 px-2">
          <select value={categoriaId} disabled={pendente} onChange={(e) => aoTrocarCategoria(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 px-2">
          <select
            value={subcategoriaId}
            disabled={pendente || subcategorias.length === 0}
            onChange={(e) => aoTrocarSubcategoria(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {subcategorias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 px-2">
          <select value={objetivoId} disabled={pendente} onChange={(e) => aoTrocarObjetivo(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </td>
      </tr>
      {(erro || desvio) && (
        <tr>
          <td colSpan={COLUNAS.length} className="px-2 pb-2">
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
          </td>
        </tr>
      )}
    </>
  );
}
