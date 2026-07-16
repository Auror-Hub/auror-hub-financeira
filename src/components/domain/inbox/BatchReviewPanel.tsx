"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { ItemFila } from "@/lib/domain/inbox";
import type { CorrecaoClassificacao } from "@/lib/classificacao/decisoes";
import { formatBRL, formatData } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { SuggestionBlock } from "./SuggestionBlock";

export interface BatchReviewPanelProps {
  itens: ItemFila[];
  open: boolean;
  rotulos: Record<string, string>;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
  onClose: () => void;
  onAplicar: (ids: string[]) => void;
  onEditarEAplicar: (ids: string[], correcao: CorrecaoClassificacao) => void;
}

/** SCR-INBOX-BATCH-001 — trata um grupo de lançamentos semelhantes como uma única decisão. */
export function BatchReviewPanel({
  itens,
  open,
  rotulos,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
  onClose,
  onAplicar,
  onEditarEAplicar,
}: BatchReviewPanelProps) {
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<"revisar" | "editar">("revisar");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [objetivoId, setObjetivoId] = useState("");

  if (!open || itens.length === 0) return null;
  const proposta = itens[0].proposta;
  const selecionados = itens.filter((i) => !excluidos.has(i.lancamento.id));
  const subcategoriasDisponiveis = subcategoriasPorCategoria[categoriaId] ?? [];

  function alternar(id: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fechar() {
    setModo("revisar");
    setCategoriaId("");
    setSubcategoriaId("");
    setObjetivoId("");
    setExcluidos(new Set());
    onClose();
  }

  function salvarEdicao() {
    if (!categoriaId || !objetivoId) return;
    onEditarEAplicar(selecionados.map((i) => i.lancamento.id), {
      categoriaId,
      subcategoriaId: subcategoriaId || undefined,
      objetivoId,
    });
  }

  return (
    <Drawer
      open={open}
      onClose={fechar}
      title={`Revisão em lote (${itens.length})`}
      subtitle={itens[0].fornecedorNomeOriginal}
      width={480}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {selecionados.length} de {itens.length} selecionados
          </span>
          {modo === "revisar" ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Pencil size={14} strokeWidth={1.75} />} onClick={() => setModo("editar")}>
                Editar lote
              </Button>
              <Button
                variant="success"
                size="sm"
                icon={<Check size={14} strokeWidth={2} />}
                disabled={selecionados.length === 0}
                onClick={() => onAplicar(selecionados.map((i) => i.lancamento.id))}
              >
                Aplicar a todos
              </Button>
            </div>
          ) : (
            <Button
              variant="success"
              size="sm"
              icon={<Check size={14} strokeWidth={2} />}
              disabled={selecionados.length === 0 || !categoriaId || !objetivoId}
              onClick={salvarEdicao}
            >
              Salvar e aplicar a todos os selecionados
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-text-secondary">
          Estes lançamentos compartilham o mesmo fornecedor e a mesma proposta de classificação. Desmarque
          algum item se ele não pertence a este grupo. {modo === "revisar" ? "Aplique a proposta da IA ou edite antes de aplicar." : "Escolha a classificação correta abaixo."}
        </p>

        {modo === "revisar" ? (
          <SuggestionBlock proposta={proposta} rotulos={rotulos} />
        ) : (
          <div className="flex flex-col gap-3 rounded-card border border-border-subtle p-3">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Categoria
              <select
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value);
                  setSubcategoriaId("");
                }}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                <option value="">Selecionar</option>
                {categorias.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Subcategoria
              <select
                value={subcategoriaId}
                onChange={(e) => setSubcategoriaId(e.target.value)}
                disabled={subcategoriasDisponiveis.length === 0}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
              >
                <option value="">{subcategoriasDisponiveis.length === 0 ? "Nenhuma subcategoria pra esta categoria" : "Nenhuma"}</option>
                {subcategoriasDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Objetivo
              <select
                value={objetivoId}
                onChange={(e) => setObjetivoId(e.target.value)}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                <option value="">Selecionar</option>
                {objetivos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="flex flex-col divide-y divide-border-subtle rounded-card border border-border-subtle">
          {itens.map((item) => {
            const excluido = excluidos.has(item.lancamento.id);
            return (
              <label
                key={item.lancamento.id}
                className={`flex cursor-pointer items-center gap-3 p-3 transition-opacity ${excluido ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={!excluido}
                  onChange={() => alternar(item.lancamento.id)}
                  className="h-4 w-4 accent-indigo"
                />
                <span className="font-mono-nums flex-1 text-sm text-text-primary">
                  {formatData(item.lancamento.data)}
                </span>
                <span className="font-mono-nums text-base font-medium text-text-primary">
                  {formatBRL(item.lancamento.valor)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}
