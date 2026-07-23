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

/** Dias já decorridos (incluindo hoje) e dias totais do mês civil de `mesReferencia`. null se não for o mês corrente. */
export function diasDecorridosNoMes(mesReferencia: string, hoje: Date): { decorridos: number; total: number } | null {
  const mesAtualIso = hoje.toISOString().slice(0, 7);
  if (mesReferencia !== mesAtualIso) return null;

  const [ano, mes] = mesReferencia.split("-").map(Number);
  const total = new Date(ano, mes, 0).getDate();
  return { decorridos: hoje.getDate(), total };
}

/** "2026-07", 3 => ["2026-06", "2026-05", "2026-04"] (mais recente primeiro). */
export function mesesAnteriores(mesReferencia: string, quantidade: number): string[] {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  const resultado: string[] = [];
  for (let i = 1; i <= quantidade; i++) {
    const data = new Date(ano, mes - 1 - i, 1);
    resultado.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`);
  }
  return resultado;
}

/** Próximo mês civil de `mesReferencia`. "2026-12" => "2027-01". */
export function proximoMes(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  const data = new Date(ano, mes, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Fase 16 (Auditoria V3.1): ciclo temporal (mês em curso ou não) é diferente
 * de situação de revisão (tem pendência ou não) — um mês ainda em curso, sem
 * nenhuma pendência porque poucos gastos chegaram até agora, não é a mesma
 * coisa que um mês passado genuinamente completo. Só se aplica a competências
 * que ainda não foram fechadas/reabertas (essas duas só mudam por ação
 * explícita, nunca por este cálculo).
 */
export function calcularEstadoCiclo(pendentes: number, emAndamento: boolean): "em revisão" | "pronta" | "atualizada" {
  if (pendentes > 0) return "em revisão";
  return emAndamento ? "atualizada" : "pronta";
}
