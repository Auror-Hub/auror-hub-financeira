"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import type { HistoricoPaginado } from "@/lib/historico/consulta";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HistoryRow } from "./HistoryRow";

export interface HistoryListScreenProps {
  resultado: HistoricoPaginado;
  categorias: { id: string; rotulo: string }[];
  objetivos: { id: string; rotulo: string }[];
  filtrosAtuais: { categoriaId?: string; fornecedor?: string; dataInicio?: string; dataFim?: string };
}

/** Ajuste D (brainstorm 2026-07-15) — lista plana de lançamentos já decididos, filtrável e editável inline. */
export function HistoryListScreen({ resultado, categorias, objetivos, filtrosAtuais }: HistoryListScreenProps) {
  const router = useRouter();
  const [categoriaId, setCategoriaId] = useState(filtrosAtuais.categoriaId ?? "");
  const [fornecedor, setFornecedor] = useState(filtrosAtuais.fornecedor ?? "");
  const [dataInicio, setDataInicio] = useState(filtrosAtuais.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(filtrosAtuais.dataFim ?? "");

  function aplicarFiltros() {
    const params = new URLSearchParams();
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (fornecedor) params.set("fornecedor", fornecedor);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    router.push(`/historico?${params.toString()}`);
  }

  function irParaPagina(pagina: number) {
    const params = new URLSearchParams();
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (fornecedor) params.set("fornecedor", fornecedor);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    params.set("pagina", String(pagina));
    router.push(`/historico?${params.toString()}`);
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
      </Card>

      <Card>
        <ul className="flex flex-col">
          {resultado.itens.map((item) => (
            <HistoryRow key={item.lancamentoId} item={item} categorias={categorias} objetivos={objetivos} />
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
