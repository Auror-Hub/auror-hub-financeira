"use client";

import { HelpCircle } from "lucide-react";
import type { ProvisorioPendente } from "@/lib/provisorios/consulta";
import { formatBRL, formatData } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ProvisorioReviewCardProps {
  provisorio: ProvisorioPendente;
  pendente: boolean;
  onConciliar: (lancamentoId: string) => void;
  onNaoEncontrado: () => void;
  onDescartar: () => void;
}

/**
 * Rearquitetura (Fase 3, ADR-007): cartão de revisão de um lançamento
 * provisório — estrutura própria (não é `ItemFila`, que exige uma proposta
 * de classificação sobre um lançamento real já existente). O provisório é a
 * intenção da Victoria; os candidatos são fatos bancários que talvez
 * correspondam a ela, sempre confirmados manualmente (nunca conciliação
 * automática, mesmo espírito de `possiveis_duplicatas`).
 */
export function ProvisorioReviewCard({ provisorio, pendente, onConciliar, onNaoEncontrado, onDescartar }: ProvisorioReviewCardProps) {
  return (
    <Card accent="slate" className="flex flex-col gap-3 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-base text-text-primary">{provisorio.descricaoUsuario}</span>
          <span className="font-mono-nums text-sm text-text-secondary">
            {formatBRL(provisorio.valor)} · {formatData(provisorio.dataOcorrencia)}
            {provisorio.fornecedorDica && ` · ${provisorio.fornecedorDica}`}
          </span>
          {(provisorio.categoriaDicaRotulo || provisorio.objetivoDicaRotulo) && (
            <div className="flex gap-1.5">
              {provisorio.categoriaDicaRotulo && <Badge tone="indigo">{provisorio.categoriaDicaRotulo}</Badge>}
              {provisorio.objetivoDicaRotulo && <Badge tone="slate">{provisorio.objetivoDicaRotulo}</Badge>}
            </div>
          )}
          {provisorio.contexto && <span className="text-sm text-text-muted">{provisorio.contexto}</span>}
        </div>
        <Badge tone="gold">provisório</Badge>
      </div>

      {provisorio.candidatos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Pode ser um destes lançamentos</span>
          {provisorio.candidatos.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-input border border-border-subtle p-2.5">
              <div className="flex flex-col">
                <span className="text-base text-text-primary">{c.fornecedorOriginal}</span>
                <span className="font-mono-nums text-sm text-text-muted">
                  {formatBRL(c.valor)} · {formatData(c.data)}
                </span>
              </div>
              <Button variant="secondary" size="sm" disabled={pendente} onClick={() => onConciliar(c.id)}>
                Conciliar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <HelpCircle size={14} strokeWidth={1.75} />
          Nenhum lançamento parecido encontrado ainda no acervo.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={pendente} onClick={onDescartar}>
          Descartar
        </Button>
        <Button variant="ghost" size="sm" disabled={pendente} onClick={onNaoEncontrado}>
          Nenhum destes / ainda não chegou
        </Button>
      </div>
    </Card>
  );
}
