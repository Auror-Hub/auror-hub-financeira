"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import type { HistoricoPaginado, StatusDecisaoHistorico } from "@/lib/historico/consulta";
import { formatCompetencia } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HistoryRow } from "./HistoryRow";

const STATUS_ROTULO: Record<StatusDecisaoHistorico, string> = {
  confirmada: "Confirmada",
  corrigida: "Corrigida",
  "exceção": "Exceção",
};

export interface HistoryListScreenProps {
  resultado: HistoricoPaginado;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
  cartoes: { id: string; rotulo: string; tipo: "cartao" | "conta" }[];
  competencias: string[];
  filtrosAtuais: {
    categoriaId?: string;
    fornecedor?: string;
    dataInicio?: string;
    dataFim?: string;
    competenciaMes?: string;
    objetivoId?: string;
    cartaoId?: string;
    statusDecisao?: StatusDecisaoHistorico;
    valorMin?: string;
    valorMax?: string;
  };
}

/** Ajuste D (brainstorm 2026-07-15) — lista plana de lançamentos já decididos, filtrável e editável inline. */
export function HistoryListScreen({
  resultado,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
  cartoes,
  competencias,
  filtrosAtuais,
}: HistoryListScreenProps) {
  const router = useRouter();
  const [categoriaId, setCategoriaId] = useState(filtrosAtuais.categoriaId ?? "");
  const [fornecedor, setFornecedor] = useState(filtrosAtuais.fornecedor ?? "");
  const [dataInicio, setDataInicio] = useState(filtrosAtuais.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(filtrosAtuais.dataFim ?? "");
  const [competenciaMes, setCompetenciaMes] = useState(filtrosAtuais.competenciaMes ?? "");
  // Fase 7 (Auditoria V2): filtros adicionais — colapsados por padrão pra não
  // quebrar o layout em telas estreitas com uma linha só de selects.
  const [maisFiltrosAbertos, setMaisFiltrosAbertos] = useState(
    Boolean(filtrosAtuais.objetivoId || filtrosAtuais.cartaoId || filtrosAtuais.statusDecisao || filtrosAtuais.valorMin || filtrosAtuais.valorMax),
  );
  const [objetivoId, setObjetivoId] = useState(filtrosAtuais.objetivoId ?? "");
  const [cartaoId, setCartaoId] = useState(filtrosAtuais.cartaoId ?? "");
  const [statusDecisao, setStatusDecisao] = useState<StatusDecisaoHistorico | "">(filtrosAtuais.statusDecisao ?? "");
  const [valorMin, setValorMin] = useState(filtrosAtuais.valorMin ?? "");
  const [valorMax, setValorMax] = useState(filtrosAtuais.valorMax ?? "");

  function montarParams(pagina?: number) {
    const params = new URLSearchParams();
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (fornecedor) params.set("fornecedor", fornecedor);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    if (competenciaMes) params.set("competenciaMes", competenciaMes);
    if (objetivoId) params.set("objetivoId", objetivoId);
    if (cartaoId) params.set("cartaoId", cartaoId);
    if (statusDecisao) params.set("statusDecisao", statusDecisao);
    if (valorMin) params.set("valorMin", valorMin);
    if (valorMax) params.set("valorMax", valorMax);
    if (pagina) params.set("pagina", String(pagina));
    return params;
  }

  function aplicarFiltros() {
    router.push(`/historico?${montarParams().toString()}`);
  }

  function irParaPagina(pagina: number) {
    router.push(`/historico?${montarParams(pagina).toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <History size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Histórico</h1>
        <span className="font-mono-nums text-sm text-text-muted">{resultado.total} lançamentos</span>
      </div>

      <Card className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Competência
          <select
            value={competenciaMes}
            onChange={(e) => setCompetenciaMes(e.target.value)}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Todas</option>
            {competencias.map((mes) => (
              <option key={mes} value={mes}>
                {formatCompetencia(mes)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Categoria
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
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
          Fornecedor
          <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Uber" className="h-[34px]" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          De
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-[34px]" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Até
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-[34px]" />
        </label>
        <Button variant="primary" size="sm" onClick={aplicarFiltros}>
          Aplicar filtros
        </Button>
        <button
          type="button"
          onClick={() => setMaisFiltrosAbertos((v) => !v)}
          className="flex items-center gap-1 text-sm text-action-primary hover:underline"
        >
          Mais filtros
          {maisFiltrosAbertos ? <ChevronUp size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
        </button>
      </Card>

      {maisFiltrosAbertos && (
        <Card className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Objetivo
            <select
              value={objetivoId}
              onChange={(e) => setObjetivoId(e.target.value)}
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
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Conta/cartão
            <select
              value={cartaoId}
              onChange={(e) => setCartaoId(e.target.value)}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Todas</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo} ({c.tipo === "conta" ? "conta" : "cartão"})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Status da decisão
            <select
              value={statusDecisao}
              onChange={(e) => setStatusDecisao(e.target.value as StatusDecisaoHistorico | "")}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor de (R$)
            <Input type="number" min="0" step="0.01" value={valorMin} onChange={(e) => setValorMin(e.target.value)} className="h-[34px] w-28" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor até (R$)
            <Input type="number" min="0" step="0.01" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className="h-[34px] w-28" />
          </label>
          <Button variant="primary" size="sm" onClick={aplicarFiltros}>
            Aplicar filtros
          </Button>
        </Card>
      )}

      <Card>
        <ul className="flex flex-col">
          {resultado.itens.map((item) => (
            <HistoryRow
              key={item.lancamentoId}
              item={item}
              categorias={categorias}
              subcategoriasPorCategoria={subcategoriasPorCategoria}
              objetivos={objetivos}
            />
          ))}
          {resultado.itens.length === 0 && (
            <li className="py-6 text-center text-base text-text-muted">Nenhum lançamento decidido encontrado para este filtro.</li>
          )}
        </ul>
      </Card>

      {resultado.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" disabled={resultado.pagina <= 1} onClick={() => irParaPagina(resultado.pagina - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-text-muted">
            Página {resultado.pagina} de {resultado.totalPaginas}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={resultado.pagina >= resultado.totalPaginas}
            onClick={() => irParaPagina(resultado.pagina + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
