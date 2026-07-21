import type { PainelControle } from "./consulta";
import type { PlanoMensal } from "@/lib/plano/consulta";
import type { NaturezaPlano } from "@/lib/plano/validacao";

const LIMIAR_ATENCAO = 0.8;
const LIMIAR_TENDENCIA = 0.05;

export type SituacaoMatriz = "dentro" | "atencao" | "excedido" | "sem_plano";
export type TendenciaMatriz = "subindo" | "caindo" | "estavel" | null;

export interface LinhaMatriz {
  categoriaId: string;
  categoriaRotulo: string;
  planejado: number | null;
  realizado: number;
  desvioReais: number | null;
  desvioPercentual: number | null;
  tendencia: TendenciaMatriz;
  natureza: NaturezaPlano | null;
  situacao: SituacaoMatriz;
}

function classificarTendencia(variacao: number | null): TendenciaMatriz {
  if (variacao === null) return null;
  if (variacao > LIMIAR_TENDENCIA) return "subindo";
  if (variacao < -LIMIAR_TENDENCIA) return "caindo";
  return "estavel";
}

function classificarSituacao(realizado: number, planejado: number | null): SituacaoMatriz {
  if (planejado === null) return "sem_plano";
  if (planejado <= 0) return realizado > 0 ? "excedido" : "dentro";
  const percentual = realizado / planejado;
  if (percentual >= 1) return "excedido";
  if (percentual >= LIMIAR_ATENCAO) return "atencao";
  return "dentro";
}

/**
 * Fase 9 (Auditoria V2): matriz plano×realizado — cruza o painel vivo (gasto
 * real por categoria no período) com o plano mensal (Fase 8), categoria a
 * categoria. Categoria com gasto mas sem linha de plano entra com
 * `planejado: null` e situação "sem_plano" — nunca inventa um planejado que
 * não existe. A linha "geral" do plano (categoriaId null, orçamento não
 * atribuído a uma categoria específica) não entra aqui — é um conceito de
 * reserva/buffer, não uma comparação por categoria.
 */
export function montarMatrizControle(painel: PainelControle, plano: PlanoMensal): LinhaMatriz[] {
  const linhasPlanoPorCategoria = new Map(plano.linhas.filter((l) => l.categoriaId !== null).map((l) => [l.categoriaId as string, l]));

  const linhas: LinhaMatriz[] = painel.categorias.map((cat) => {
    const linhaPlano = linhasPlanoPorCategoria.get(cat.categoriaId);
    const planejado = linhaPlano ? linhaPlano.valorPlanejado : null;
    const desvioReais = planejado !== null ? cat.total - planejado : null;
    const desvioPercentual = planejado !== null && planejado > 0 ? (desvioReais as number) / planejado : null;
    return {
      categoriaId: cat.categoriaId,
      categoriaRotulo: cat.rotulo,
      planejado,
      realizado: cat.total,
      desvioReais,
      desvioPercentual,
      tendencia: classificarTendencia(cat.variacaoVsAnterior),
      natureza: linhaPlano?.natureza ?? null,
      situacao: classificarSituacao(cat.total, planejado),
    };
  });

  const categoriasComGasto = new Set(painel.categorias.map((c) => c.categoriaId));
  for (const linhaPlano of plano.linhas) {
    if (linhaPlano.categoriaId === null || categoriasComGasto.has(linhaPlano.categoriaId)) continue;
    linhas.push({
      categoriaId: linhaPlano.categoriaId,
      categoriaRotulo: linhaPlano.categoriaRotulo,
      planejado: linhaPlano.valorPlanejado,
      realizado: 0,
      desvioReais: -linhaPlano.valorPlanejado,
      desvioPercentual: -1,
      tendencia: null,
      natureza: linhaPlano.natureza,
      situacao: "dentro",
    });
  }

  return linhas.sort((a, b) => b.realizado - a.realizado);
}
