import "server-only";
import type { Supabase } from "@/lib/competencias/reabertura";

const VERSAO_MOTOR_ANALITICO = "heuristica-v0";
const LIMIAR_VARIACAO = 0.1;

interface DadosCongelados {
  totalLancamentos: number;
  totalConsolidado: number;
  quebraPorCategoria: Record<string, number>;
  quebraPorObjetivo: Record<string, number>;
}

/**
 * Valores no banco são sempre negativos para despesa (convenção do sistema
 * desde BE-2). Aqui recebemos os dois operandos já como magnitude de gasto
 * (positivos) — variação positiva = gastou mais, negativa = gastou menos.
 */
export function variacaoPercentual(atualGasto: number, anteriorGasto: number): number | null {
  if (anteriorGasto === 0) return null;
  return (atualGasto - anteriorGasto) / Math.abs(anteriorGasto);
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function formatBRLSimples(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface InsightParaInserir {
  competenciaId: string;
  snapshotId: string;
  tipo: string;
  titulo: string;
  explicacao: string;
  relevancia: number;
  confianca: number;
  impacto: number;
  metricaTipo: "variacao_total" | "variacao_categoria";
  metricaValor: number;
  dimensaoRefId?: string;
  recomendacao?: { texto: string; tipo: "economia" | "atenção" | "observação futura" };
}

async function inserirInsight(supabase: Supabase, dados: InsightParaInserir): Promise<void> {
  const { data: metrica, error: errMetrica } = await supabase
    .from("metricas")
    .insert({
      snapshot_id: dados.snapshotId,
      tipo: dados.metricaTipo,
      dimensao_ref_id: dados.dimensaoRefId ?? null,
      valor: dados.metricaValor,
    })
    .select()
    .single();
  if (errMetrica || !metrica) throw new Error("Falha ao gravar métrica: " + (errMetrica?.message ?? "erro desconhecido"));

  const { data: insight, error: errInsight } = await supabase
    .from("insights")
    .insert({
      competencia_id: dados.competenciaId,
      tipo: dados.tipo,
      titulo: dados.titulo,
      explicacao: dados.explicacao,
      relevancia: dados.relevancia,
      confianca: dados.confianca,
      impacto: dados.impacto,
      versao_motor_analitico: VERSAO_MOTOR_ANALITICO,
    })
    .select()
    .single();
  if (errInsight || !insight) throw new Error("Falha ao gravar insight: " + (errInsight?.message ?? "erro desconhecido"));

  const { error: errEvidencia } = await supabase
    .from("insight_evidencias")
    .insert({ insight_id: insight.id, metrica_id: metrica.id });
  if (errEvidencia) throw new Error("Falha ao gravar evidência: " + errEvidencia.message);

  if (dados.recomendacao) {
    const { error: errRecomendacao } = await supabase
      .from("recomendacoes")
      .insert({ insight_relacionado_id: insight.id, texto: dados.recomendacao.texto, tipo: dados.recomendacao.tipo });
    if (errRecomendacao) throw new Error("Falha ao gravar recomendação: " + errRecomendacao.message);
  }
}

/**
 * Agente Analista (Fase 6) — heurística determinística, sem LLM. Compara o
 * snapshot recém-gerado com o snapshot da competência fechada cronologicamente
 * anterior do mesmo perfil (se houver) e grava insights de variação.
 * Chamada dentro de fecharCompetencia(), depois do snapshot já commitado.
 */
export async function gerarInsights(
  supabase: Supabase,
  perfilId: string,
  competenciaId: string,
  snapshotId: string,
  mesReferencia: string,
  dadosCongelados: DadosCongelados,
): Promise<void> {
  // Refechamento: insights antigos desta competência deixam de ser vigentes,
  // mas nunca são apagados/editados em conteúdo (RUL-11, mesmo espírito).
  await supabase.from("insights").update({ status: "superseded" }).eq("competencia_id", competenciaId).eq("status", "ativo");

  const { data: competenciaAnterior } = await supabase
    .from("competencias")
    .select("id")
    .eq("perfil_id", perfilId)
    .lt("mes_referencia", mesReferencia)
    .order("mes_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  let dadosAnteriores: DadosCongelados | null = null;
  let competenciasAnterioresDisponiveis = 0;

  if (competenciaAnterior) {
    const { data: snapshotAnterior } = await supabase
      .from("snapshots_analiticos")
      .select("dados_congelados")
      .eq("competencia_id", competenciaAnterior.id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    dadosAnteriores = (snapshotAnterior?.dados_congelados as DadosCongelados | undefined) ?? null;

    const { count } = await supabase
      .from("competencias")
      .select("id", { count: "exact", head: true })
      .eq("perfil_id", perfilId)
      .lt("mes_referencia", mesReferencia)
      .in("estado", ["fechada", "reaberta"]);
    competenciasAnterioresDisponiveis = count ?? 0;
  }

  if (!dadosAnteriores) {
    await inserirInsight(supabase, {
      competenciaId,
      snapshotId,
      tipo: "sem_historico",
      titulo: "Primeira competência fechada",
      explicacao:
        "Esta é a primeira competência fechada deste acervo — comparações históricas de variação ficam disponíveis a partir do próximo fechamento.",
      relevancia: 0.2,
      confianca: 0.3,
      impacto: 0,
      metricaTipo: "variacao_total",
      metricaValor: 0,
    });
    return;
  }

  const confianca = clamp01(0.5 + 0.15 * Math.min(competenciasAnterioresDisponiveis, 3));

  const variacaoTotal = variacaoPercentual(-dadosCongelados.totalConsolidado, -dadosAnteriores.totalConsolidado);
  if (variacaoTotal !== null && Math.abs(variacaoTotal) >= LIMIAR_VARIACAO) {
    const aumento = variacaoTotal > 0;
    const percentual = Math.round(Math.abs(variacaoTotal) * 100);
    await inserirInsight(supabase, {
      competenciaId,
      snapshotId,
      tipo: "variacao_total",
      titulo: `${aumento ? "Aumento" : "Redução"} de ${percentual}% no total consolidado`,
      explicacao: `O total consolidado desta competência foi de ${formatBRLSimples(dadosCongelados.totalConsolidado)}, ${aumento ? "um aumento" : "uma redução"} de ${percentual}% em relação à competência anterior (${formatBRLSimples(dadosAnteriores.totalConsolidado)}).`,
      relevancia: clamp01(Math.abs(variacaoTotal) / 0.5),
      confianca,
      impacto: clamp01(Math.abs(dadosCongelados.totalConsolidado - dadosAnteriores.totalConsolidado) / Math.abs(dadosAnteriores.totalConsolidado)),
      metricaTipo: "variacao_total",
      metricaValor: variacaoTotal,
      recomendacao: aumento
        ? { texto: "Revise as maiores despesas desta competência para entender o que impulsionou o aumento.", tipo: "atenção" }
        : undefined,
    });
  }

  let maiorCategoria: { categoriaId: string; variacao: number } | null = null;
  for (const [categoriaId, valorAtual] of Object.entries(dadosCongelados.quebraPorCategoria)) {
    const valorAnterior = dadosAnteriores.quebraPorCategoria[categoriaId];
    if (valorAnterior === undefined) continue;
    const variacao = variacaoPercentual(-valorAtual, -valorAnterior);
    if (variacao === null || Math.abs(variacao) < LIMIAR_VARIACAO) continue;
    if (!maiorCategoria || Math.abs(variacao) > Math.abs(maiorCategoria.variacao)) {
      maiorCategoria = { categoriaId, variacao };
    }
  }

  if (maiorCategoria) {
    const { categoriaId, variacao } = maiorCategoria;
    const { data: termo } = await supabase.from("taxonomia_termos").select("rotulo").eq("id", categoriaId).maybeSingle();
    const rotulo = (termo?.rotulo as string | undefined) ?? "uma categoria";
    const aumento = variacao > 0;
    const percentual = Math.round(Math.abs(variacao) * 100);
    const valorAtual = dadosCongelados.quebraPorCategoria[categoriaId];
    const valorAnterior = dadosAnteriores.quebraPorCategoria[categoriaId];

    await inserirInsight(supabase, {
      competenciaId,
      snapshotId,
      tipo: "variacao_categoria",
      titulo: `${aumento ? "Aumento" : "Redução"} de ${percentual}% em ${rotulo}`,
      explicacao: `Os gastos em ${rotulo} foram de ${formatBRLSimples(valorAtual)}, ${aumento ? "um aumento" : "uma redução"} de ${percentual}% em relação à competência anterior (${formatBRLSimples(valorAnterior)}).`,
      relevancia: clamp01(Math.abs(variacao) / 0.5),
      confianca,
      impacto: clamp01(Math.abs(valorAtual - valorAnterior) / Math.abs(dadosAnteriores.totalConsolidado)),
      metricaTipo: "variacao_categoria",
      metricaValor: variacao,
      dimensaoRefId: categoriaId,
      recomendacao: aumento ? { texto: `Vale revisar os lançamentos de ${rotulo} desta competência.`, tipo: "atenção" } : undefined,
    });
  }
}
