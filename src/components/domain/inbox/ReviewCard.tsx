import { Layers } from "lucide-react";
import type { ItemFila } from "@/lib/domain/inbox";
import { formatBRL, formatData } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

const PENDENCIA_TONE: Record<string, BadgeTone> = {
  "baixa confiança": "terra",
  "fornecedor desconhecido": "gold",
  "fornecedor ambíguo": "gold",
  duplicidade: "terra",
  extraordinário: "gold",
  "contexto necessário": "slate",
  "regra conflitante": "terra",
};

export interface ReviewCardProps {
  item: ItemFila;
  rotulos: Record<string, string>;
  onAbrir: () => void;
  onConfirmar: () => void;
}

export function ReviewCard({ item, rotulos, onAbrir, onConfirmar }: ReviewCardProps) {
  const { lancamento, proposta } = item;
  const fornecedor = (proposta.fornecedorSugeridoId && rotulos[proposta.fornecedorSugeridoId]) || item.fornecedorNomeOriginal;
  const categoria = proposta.dimensoes.categoria ? rotulos[proposta.dimensoes.categoria] : undefined;
  const objetivo = proposta.dimensoes.objetivo ? rotulos[proposta.dimensoes.objetivo] : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-primary p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onAbrir} className="flex flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-base font-medium text-text-primary">{fornecedor}</span>
          <span className="text-sm text-text-muted">{item.fornecedorNomeOriginal}</span>
        </button>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono-nums text-lg font-semibold text-text-primary">
            {formatBRL(lancamento.valor)}
          </span>
          <span className="font-mono-nums text-sm text-text-muted">{formatData(lancamento.data)}</span>
        </div>
      </div>

      {(categoria || objetivo) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categoria && <Badge tone="slate">{categoria}</Badge>}
          {objetivo && <Badge tone="slate">{objetivo}</Badge>}
          {item.grupoLoteId && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Layers size={12} strokeWidth={1.75} />
              Grupo semelhante
            </span>
          )}
        </div>
      )}

      {item.tiposPendencia.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tiposPendencia.map((t) => (
            <Badge key={t} tone={PENDENCIA_TONE[t] ?? "slate"}>
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <ConfidenceIndicator valor={proposta.confiancaGeral} compact />
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirmar}
            className="rounded-btn-sm bg-state-success px-2.5 py-1 text-xs font-medium text-white transition-colors hover:brightness-110"
          >
            Confirmar
          </button>
          <button
            onClick={onAbrir}
            className="rounded-btn-sm border border-border-default px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  );
}
