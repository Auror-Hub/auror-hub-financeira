import type { Insight } from "@/lib/domain/types";
import { Card } from "@/components/ui/Card";

/**
 * Apresenta um insight como narrativa — título + explicação em texto corrido.
 * A explicação (frase interpretativa) é o conteúdo principal; nunca é
 * substituída por número solto ou gráfico (regra da arquitetura).
 */
export function InsightNarrative({ insight }: { insight: Insight }) {
  return (
    <Card accent="slate" className="p-3.5">
      <h3 className="mb-1 text-md font-semibold text-text-primary">{insight.titulo}</h3>
      <p className="text-base leading-relaxed text-text-secondary">{insight.explicacao}</p>
    </Card>
  );
}
