"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { ItemFila } from "@/lib/domain/inbox";
import { formatBRL, formatData } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { SuggestionBlock } from "./SuggestionBlock";

export interface BatchReviewPanelProps {
  itens: ItemFila[];
  open: boolean;
  rotulos: Record<string, string>;
  onClose: () => void;
  onAplicar: (ids: string[]) => void;
}

/** SCR-INBOX-BATCH-001 — trata um grupo de lançamentos semelhantes como uma única decisão. */
export function BatchReviewPanel({ itens, open, rotulos, onClose, onAplicar }: BatchReviewPanelProps) {
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  if (!open || itens.length === 0) return null;
  const proposta = itens[0].proposta;
  const selecionados = itens.filter((i) => !excluidos.has(i.lancamento.id));

  function alternar(id: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Revisão em lote (${itens.length})`}
      subtitle={itens[0].fornecedorNomeOriginal}
      width={480}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {selecionados.length} de {itens.length} selecionados
          </span>
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
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-text-secondary">
          Estes lançamentos compartilham o mesmo fornecedor e a mesma proposta de classificação. Desmarque
          algum item se ele não pertence a este grupo, depois aplique a decisão de uma vez só.
        </p>

        <SuggestionBlock proposta={proposta} rotulos={rotulos} />

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
