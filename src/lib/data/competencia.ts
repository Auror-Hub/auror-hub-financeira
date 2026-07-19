/**
 * Rearquitetura (Fase 0, ADR-007): extraído de src/lib/import/parse.ts pra um
 * módulo neutro (sem `server-only`), testável direto. `parse.ts` re-exporta
 * pra não quebrar quem já importa de lá.
 */
export function calcularCompetencia(dataIso: string): string {
  return dataIso.slice(0, 7);
}

/**
 * Rearquitetura (Fase 1, ADR-007): dias restantes até o fim do mês civil de
 * `mesReferencia`, contados a partir de `hoje`. Só faz sentido quando a
 * competência de referência É o mês corrente — se `hoje` já passou desse mês
 * (competência aberta antiga) ou ainda não chegou nele, retorna null em vez
 * de um número negativo/sem sentido (nunca inventar "dias restantes" fora do
 * mês em que se está de fato).
 */
export function diasRestantesNoMes(mesReferencia: string, hoje: Date): number | null {
  const mesAtualIso = hoje.toISOString().slice(0, 7);
  if (mesReferencia !== mesAtualIso) return null;

  const [ano, mes] = mesReferencia.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return ultimoDia - hoje.getDate();
}
