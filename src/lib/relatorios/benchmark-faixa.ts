/**
 * Fase 12 (Auditoria V2): puro, sem I/O — separado de `benchmark.ts` (que
 * tem `server-only` por fazer consultas) só pra poder ser testado
 * diretamente. Guardrail de linguagem aplicado na origem do texto, não só
 * no prompt do narrador: sempre faixa/referência, nunca "certo/errado/ideal".
 */
export function montarFaixaTexto(variacao12m: number | null, regiao: string, periodoReferencia: string): string {
  if (variacao12m === null) {
    return `Sem variação de preços acumulada em 12 meses disponível para ${regiao} em ${periodoReferencia}.`;
  }
  const direcao = variacao12m > 0 ? "alta" : variacao12m < 0 ? "queda" : "estabilidade";
  const magnitude = Math.abs(variacao12m).toFixed(2).replace(".", ",");
  return `Preços desta categoria (referência IPCA/IBGE, ${regiao}) indicam ${direcao} de ${magnitude}% acumulada nos últimos 12 meses até ${periodoReferencia} — uma faixa de referência, não um "certo" ou "errado" para o gasto da família.`;
}
