import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { Insight, Recomendacao, StatusInsight, TipoRecomendacao } from "@/lib/domain/types";

export interface InsightsDaCompetencia {
  insights: Insight[];
  recomendacoes: Recomendacao[];
}

/** Insights vigentes (status='ativo') de uma competência + recomendações relacionadas, para a tela de detalhe. */
export async function carregarInsightsDaCompetencia(competenciaId: string): Promise<InsightsDaCompetencia> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: insightsRaw, error: errInsights } = await supabase
    .from("insights")
    .select("*")
    .eq("competencia_id", competenciaId)
    .eq("status", "ativo")
    .order("relevancia", { ascending: false });
  if (errInsights) throw new Error("Falha ao carregar insights: " + errInsights.message);

  const insights: Insight[] = (insightsRaw ?? []).map((i) => ({
    id: i.id as string,
    competenciaId: i.competencia_id as string,
    tipo: i.tipo as string,
    titulo: i.titulo as string,
    explicacao: i.explicacao as string,
    relevancia: i.relevancia as number,
    confianca: i.confianca as number,
    impacto: i.impacto as number,
    status: i.status as StatusInsight,
    versaoMotorAnalitico: i.versao_motor_analitico as string,
  }));

  if (insights.length === 0) return { insights: [], recomendacoes: [] };

  const idsInsights = insights.map((i) => i.id);
  const { data: recomendacoesRaw, error: errRecomendacoes } = await supabase
    .from("recomendacoes")
    .select("*")
    .in("insight_relacionado_id", idsInsights);
  if (errRecomendacoes) throw new Error("Falha ao carregar recomendações: " + errRecomendacoes.message);

  const recomendacoes: Recomendacao[] = (recomendacoesRaw ?? []).map((r) => ({
    id: r.id as string,
    insightRelacionadoId: r.insight_relacionado_id as string,
    texto: r.texto as string,
    tipo: r.tipo as TipoRecomendacao,
  }));

  return { insights, recomendacoes };
}
