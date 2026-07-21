import type { LinhaMatriz } from "./matriz";

export interface SinalPriorizado {
  categoriaId: string;
  categoriaRotulo: string;
  porque: string;
  impactoReais: number;
}

const MAX_SINAIS = 3;
// Um desvio de 300% em R$5 não é um sinal real — piso de materialidade em R$ absoluto,
// mesmo espírito do piso já usado em despesas extraordinárias/categorias pressionadas.
const PISO_IMPACTO_REAIS = 10000; // R$ 100,00 em centavos

const PESOS = {
  impacto: 0.4,
  desvioPercentual: 0.25,
  recorrencia: 0.2,
  ajustabilidade: 0.15,
};

// "Protegido" nunca gera sinal — por definição é gasto que não se decide cortar
// (aluguel, por exemplo); um sinal "para decidir" sobre algo indecidível não ajuda.
const NATUREZAS_ACIONAVEIS: Record<string, number> = {
  ajustavel: 1,
  reserva: 0.6,
  comprometido: 0.3,
};

/**
 * Fase 9 (Auditoria V2): heurística de primeiro corte pra priorizar até 3
 * sinais dignos de decisão — nunca todas as categorias fora do plano de uma
 * vez. Score = impacto absoluto (R$) × peso + desvio % × peso + recorrência
 * (quantos dos últimos meses essa categoria também estava em atenção/excedida,
 * incluindo o mês atual) × peso + ajustabilidade (natureza do plano) × peso.
 * `recorrenciaMesesAnteriores` = contagem pré-calculada (0 a 2) de meses
 * anteriores em que a categoria já estava em atenção/excedida — opcional,
 * na ausência apenas o mês atual conta pra recorrência.
 */
export function priorizarSinais(matriz: LinhaMatriz[], recorrenciaMesesAnteriores: Map<string, number> = new Map()): SinalPriorizado[] {
  const candidatos = matriz.filter(
    (l) => (l.situacao === "atencao" || l.situacao === "excedido") && l.natureza !== null && l.natureza !== "protegido",
  );

  return candidatos
    .map((l) => {
      const impacto = Math.abs(l.desvioReais ?? 0);
      if (impacto < PISO_IMPACTO_REAIS) return null;

      const desvioPercentualAbs = Math.min(1, Math.abs(l.desvioPercentual ?? 0));
      const recorrencia = Math.min(3, (recorrenciaMesesAnteriores.get(l.categoriaId) ?? 0) + 1);
      const ajustabilidade = l.natureza ? NATUREZAS_ACIONAVEIS[l.natureza] ?? 0 : 0;

      const score =
        PESOS.impacto * Math.min(1, impacto / 100000) +
        PESOS.desvioPercentual * desvioPercentualAbs +
        PESOS.recorrencia * (recorrencia / 3) +
        PESOS.ajustabilidade * ajustabilidade;

      const percentualTexto = Math.abs(Math.round((l.desvioPercentual ?? 0) * 100));
      const porque = `${l.situacao === "excedido" ? "Excedeu" : "Perto de exceder"} o plano em ${percentualTexto}%${
        recorrencia >= 2 ? `, recorrente há ${recorrencia} meses` : ""
      }.`;

      return {
        categoriaId: l.categoriaId,
        categoriaRotulo: l.categoriaRotulo,
        porque,
        impactoReais: l.desvioReais ?? 0,
        score,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SINAIS)
    .map(({ score, ...resto }) => {
      void score;
      return resto;
    });
}
