export interface AgregadoValores {
  gastoBruto: number;
  creditos: number;
  gastoLiquido: number;
  quantidadeDeGastos: number;
}

/**
 * Fase 14 (Auditoria V3.1): despesa é negativa, crédito/estorno é positivo
 * (convenção do sistema desde a importação, `import/actions.ts`) — agregação
 * correta nunca aplica `Math.abs` por lançamento antes de somar, porque isso
 * conta o crédito como gasto extra em vez de reduzir o líquido.
 * `gastoLiquido` é `gastoBruto - creditos` (positivo quando a família gastou
 * mais do que recebeu de volta no período; negativo no caso raro contrário).
 */
export function agregarLancamentos(lancamentos: { valor: number }[]): AgregadoValores {
  let gastoBruto = 0;
  let creditos = 0;
  let quantidadeDeGastos = 0;
  for (const l of lancamentos) {
    if (l.valor < 0) {
      gastoBruto += -l.valor;
      quantidadeDeGastos++;
    } else if (l.valor > 0) {
      creditos += l.valor;
    }
  }
  return { gastoBruto, creditos, gastoLiquido: gastoBruto - creditos, quantidadeDeGastos };
}

/** Agrupa lançamentos por uma chave (ex.: categoriaId) e agrega cada grupo. Chaves nulas são ignoradas. */
export function agregarPorChave<T extends { valor: number }>(
  lancamentos: T[],
  chave: (item: T) => string | null,
): Map<string, AgregadoValores> {
  const grupos = new Map<string, T[]>();
  for (const l of lancamentos) {
    const k = chave(l);
    if (k === null) continue;
    const grupo = grupos.get(k);
    if (grupo) grupo.push(l);
    else grupos.set(k, [l]);
  }
  const resultado = new Map<string, AgregadoValores>();
  for (const [k, grupo] of grupos) resultado.set(k, agregarLancamentos(grupo));
  return resultado;
}
