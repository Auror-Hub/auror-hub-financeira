export type ModuloRelatorioSlug =
  | "resumo_executivo"
  | "fechamento_do_mes"
  | "o_que_mudou"
  | "metas_e_decisoes"
  | "proximo_ciclo"
  | "composicao"
  | "fora_do_padrao"
  | "comparacao_historica"
  | "renda_e_saude"
  | "benchmark_externo";

export interface ModuloElegivel {
  slug: ModuloRelatorioSlug;
  titulo: string;
  nucleo: boolean;
}

export interface PacoteDadosRelatorio {
  totalLancamentos: number;
  /** 0 a 1 — fração de lançamentos com decisão vigente no período. */
  coberturaClassificacao: number;
  /** Insight tipo "variacao_categoria" já detectado pelo Agente Analista (Fase 6) — reaproveitado, sem nova heurística. */
  temInsightDeVariacaoCategoria: boolean;
  existeCompetenciaAnteriorFechada: boolean;
  /** `planos_mensais.renda_informada` (Fase 8) — null quando não informada, nunca 0 por omissão. */
  rendaInformada: number | null;
  /** `familias.consentimento_comparacao_externa` (Fase 12) — só true quando a família marcou explicitamente o consentimento em Configurações. */
  consentimentoComparacaoExterna: boolean;
}

const NUCLEO: { slug: ModuloRelatorioSlug; titulo: string }[] = [
  { slug: "resumo_executivo", titulo: "Resumo executivo" },
  { slug: "fechamento_do_mes", titulo: "Fechamento do mês" },
  { slug: "o_que_mudou", titulo: "O que mudou" },
  { slug: "metas_e_decisoes", titulo: "Metas e decisões" },
  { slug: "proximo_ciclo", titulo: "Próximo ciclo" },
];

const LIMIAR_COBERTURA_COMPOSICAO = 0.5;

/**
 * Fase 10 (Auditoria V2): decide quais módulos entram no relatório ANTES de
 * chamar o narrador — nunca pede à IA uma seção sem base real (ex.: Renda
 * sem renda informada, Composição sem cobertura mínima de classificação).
 * Núcleo sempre entra; elegibilidade dos demais é puramente estrutural,
 * nunca estimada a partir de dado ausente.
 */
export function selecionarModulos(pacote: PacoteDadosRelatorio): ModuloElegivel[] {
  const modulos: ModuloElegivel[] = NUCLEO.map((m) => ({ ...m, nucleo: true }));

  if (pacote.totalLancamentos > 0 && pacote.coberturaClassificacao >= LIMIAR_COBERTURA_COMPOSICAO) {
    modulos.push({ slug: "composicao", titulo: "Composição do gasto", nucleo: false });
  }
  if (pacote.temInsightDeVariacaoCategoria) {
    modulos.push({ slug: "fora_do_padrao", titulo: "Fora do padrão", nucleo: false });
  }
  if (pacote.existeCompetenciaAnteriorFechada) {
    modulos.push({ slug: "comparacao_historica", titulo: "Comparação histórica", nucleo: false });
  }
  if (pacote.rendaInformada !== null) {
    modulos.push({ slug: "renda_e_saude", titulo: "Renda e saúde financeira", nucleo: false });
  }
  if (pacote.consentimentoComparacaoExterna) {
    modulos.push({ slug: "benchmark_externo", titulo: "Comparação com referências externas", nucleo: false });
  }

  return modulos;
}
