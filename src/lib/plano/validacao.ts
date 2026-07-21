export type NaturezaPlano = "comprometido" | "protegido" | "ajustavel" | "reserva";

export interface LinhaPlanoInput {
  categoriaId: string | null;
  valorPlanejado: number;
  natureza: NaturezaPlano;
}

/**
 * Fase 8 (Auditoria V2): garante que a soma do plano nunca conta o mesmo
 * gasto duas vezes — cada categoria (ou a linha "geral", categoriaId null)
 * só pode aparecer uma vez. Puro, sem I/O, pra ficar testável direto (o
 * banco também garante isso via unique(plano_mensal_id, categoria_id), mas
 * essa validação dá o erro claro ANTES de bater no banco).
 */
export function validarLinhasPlano(linhas: LinhaPlanoInput[]): string | null {
  const vistas = new Set<string>();
  for (const linha of linhas) {
    if (linha.valorPlanejado <= 0) return "O valor planejado de cada linha precisa ser maior que zero.";
    const chave = linha.categoriaId ?? "__geral__";
    if (vistas.has(chave)) return "Cada categoria só pode ter uma linha no plano — combine os valores numa linha só.";
    vistas.add(chave);
  }
  return null;
}

/** Soma simples — segura porque `validarLinhasPlano` já garante categorias distintas. */
export function somarPlano(linhas: { valorPlanejado: number }[]): number {
  return linhas.reduce((soma, l) => soma + l.valorPlanejado, 0);
}
