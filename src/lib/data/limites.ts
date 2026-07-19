/**
 * Rearquitetura (Fase 0, ADR-007): limites de data puros, sem I/O — módulo
 * neutro (sem `server-only`) pra poder ser testado direto, sem risco do
 * pacote `server-only` reagir ao ambiente de teste.
 */

/** Início do dia calendário de `referencia` (hora zero local). */
export function limiteInicioDoDia(referencia: Date): Date {
  const inicio = new Date(referencia);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}
