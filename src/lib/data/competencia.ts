/**
 * Rearquitetura (Fase 0, ADR-007): extraído de src/lib/import/parse.ts pra um
 * módulo neutro (sem `server-only`), testável direto. `parse.ts` re-exporta
 * pra não quebrar quem já importa de lá.
 */
export function calcularCompetencia(dataIso: string): string {
  return dataIso.slice(0, 7);
}
