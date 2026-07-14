import type { PropostaClassificacao } from "@/lib/domain/types";
import { rotuloTermo } from "@/lib/mocks/taxonomy";
import { nomeFornecedor } from "@/lib/mocks/merchants";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

const DIMENSAO_LABEL: Record<string, string> = {
  categoria: "Categoria",
  subcategoria: "Subcategoria",
  objetivo: "Objetivo",
  natureza: "Natureza",
  essencialidade: "Essencialidade",
  tipoOcorrencia: "Tipo de ocorrência",
};

/**
 * Bloco de proposta da IA — sempre com tom "sugestão" (slate), nunca cores de
 * ação/estado, para não se confundir com fato ou decisão (regra central do
 * design adaptation doc).
 */
export function SuggestionBlock({ proposta }: { proposta: PropostaClassificacao }) {
  const fornecedor = nomeFornecedor(proposta.fornecedorSugeridoId);
  const dimensoesPreenchidas = Object.entries(proposta.dimensoes).filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-suggestion-border/40 bg-suggestion-tint p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-slate">Sugestão da IA</span>
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
            {DIMENSAO_LABEL[dim] ?? dim}: {rotuloTermo(termoId) ?? "—"}
          </Badge>
        ))}
      </div>

      <ConfidenceIndicator valor={proposta.confiancaGeral} />

      <p className="text-base leading-relaxed text-text-secondary">{proposta.justificativa}</p>
    </div>
  );
}
