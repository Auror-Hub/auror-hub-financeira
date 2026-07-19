/**
 * Rearquitetura (Fase 2, ADR-007): projeção v1 — puro, sem I/O. Estimativa
 * de gasto ao fim do mês por ritmo diário (gasto até agora ÷ dias decorridos
 * × dias do mês), nunca chamada de "previsão precisa" na UI — sempre exibida
 * com premissa (ritmo constante) e intervalo de incerteza (±15%, heurística
 * de primeiro corte, mesmo espírito de outros limiares documentados no
 * projeto). Não usa "compromissos futuros conhecidos" ainda — essa entidade
 * não existe no schema; quando existir, entra como termo adicional aqui.
 */

const MARGEM_INCERTEZA = 0.15;

export interface Projecao {
  estimativa: number;
  minimo: number;
  maximo: number;
}

export function calcularProjecao(gastoAtualAbs: number, diasDecorridos: number, diasNoMes: number): Projecao | null {
  if (diasDecorridos <= 0 || diasNoMes <= 0) return null;

  const ritmoDiario = gastoAtualAbs / diasDecorridos;
  const estimativa = Math.round(ritmoDiario * diasNoMes);

  return {
    estimativa,
    minimo: Math.round(estimativa * (1 - MARGEM_INCERTEZA)),
    maximo: Math.round(estimativa * (1 + MARGEM_INCERTEZA)),
  };
}
