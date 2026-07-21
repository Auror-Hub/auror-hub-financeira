import type { PropostaClassificacao } from "@/lib/domain/types";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

const DIMENSAO_LABEL: Record<string, string> = {
  categoria: "Categoria",
  subcategoria: "Subcategoria",
  objetivo: "Objetivo",
};

/**
 * Bloco de proposta da IA — sempre com tom "sugestão" (slate), nunca cores de
 * ação/estado, para não se confundir com fato ou decisão (regra central do
 * design adaptation doc).
 */
export function SuggestionBlock({ proposta, rotulos }: { proposta: PropostaClassificacao; rotulos: Record<string, string> }) {
  const fornecedor = proposta.fornecedorSugeridoId ? rotulos[proposta.fornecedorSugeridoId] : undefined;
  const dimensoesPreenchidas = Object.entries(proposta.dimensoes).filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-suggestion-border/40 bg-suggestion-tint p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-slate">Sugestão da IA</span>
        {/* Fase 7 (Auditoria V2): mantém text-xs — versão do classificador é
            metadado técnico de auditoria, não conteúdo que alguém precisa ler. */}
        <span className="font-mono-nums text-xs text-text-muted">{proposta.versaoClassificador}</span>
      </div>

      {fornecedor && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Fornecedor:</span>
          <span className="text-base font-medium text-text-primary">{fornecedor}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {dimensoesPreenchidas.map(([dim, termoId]) => (
          <Badge key={dim} tone="slate">
            {DIMENSAO_LABEL[dim] ?? dim}: {(termoId && rotulos[termoId]) ?? "—"}
          </Badge>
        ))}
      </div>

      {proposta.contextoSugerido && (
        <p className="text-sm text-text-muted">
          <span className="font-medium">Contexto sugerido:</span> {proposta.contextoSugerido}
        </p>
      )}

      <ConfidenceIndicator valor={proposta.confiancaGeral} />

      <p className="text-base leading-relaxed text-text-secondary">{proposta.justificativa}</p>
    </div>
  );
}
