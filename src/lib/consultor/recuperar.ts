import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarDadosDashboard } from "@/lib/dashboards/consulta";
import { carregarInsightsDaCompetencia } from "@/lib/analise/consulta";
import { carregarRelatorioVersao, carregarVersaoVigentePorCompetencia } from "@/lib/relatorios/consulta";
import type { Insight, Recomendacao } from "@/lib/domain/types";
import type { IntencaoEstruturada } from "./interpretar";

export interface DadosTotalCategoriaPeriodo {
  tipo: "total_categoria_periodo";
  categoriaRotulo: string;
  dataInicio: string;
  dataFim: string;
  totalCentavos: number;
  totalLancamentos: number;
}

export interface DadosComparacaoPeriodos {
  tipo: "comparacao_periodos";
  categoriaRotulo?: string;
  periodoA: { inicio: string; fim: string; totalCentavos: number; totalLancamentos: number };
  periodoB: { inicio: string; fim: string; totalCentavos: number; totalLancamentos: number };
}

export interface DespesaResumo {
  fornecedor: string;
  valorCentavos: number;
  data: string;
  categoriaRotulo: string | null;
}

export interface DadosMaioresDespesas {
  tipo: "maiores_despesas";
  dataInicio: string;
  dataFim: string;
  despesas: DespesaResumo[];
}

export interface DadosResumoInsights {
  tipo: "resumo_insights_competencia";
  mesReferencia: string;
  competenciaId: string;
  insights: Insight[];
  recomendacoes: Recomendacao[];
}

export interface DadosResumoRelatorio {
  tipo: "resumo_relatorio";
  mesReferencia: string;
  versaoId: string;
  conteudoHtmlSemObjetivos: string;
  metodologia: string;
}

export type DadosRecuperados =
  | DadosTotalCategoriaPeriodo
  | DadosComparacaoPeriodos
  | DadosMaioresDespesas
  | DadosResumoInsights
  | DadosResumoRelatorio;

async function resolverCategoriaId(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  rotulo: string,
): Promise<string | null> {
  const { data } = await supabase.from("taxonomia_termos").select("id").eq("dimensao", "categoria").eq("rotulo", rotulo).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function resolverCompetenciaId(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  perfilId: string,
  mesReferencia: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("competencias")
    .select("id")
    .eq("perfil_id", perfilId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Remove a seção "Distribuição por objetivos" do HTML do relatório antes de
 * qualquer envio à API — objetivo = nome de pessoa da família (mesma
 * decisão de privacidade do Agente Narrador, Fase 7). O Consultor nunca
 * recebe essa quebra, nem pra resumir.
 */
function removerSecaoObjetivos(html: string): string {
  return html.replace(/<h2>Distribuição por objetivos<\/h2>[\s\S]*?(?=<h2>|$)/, "");
}

async function buscarMaioresDespesas(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  cartaoIds: string[],
  dataInicio: string,
  dataFim: string,
  limite: number,
): Promise<DespesaResumo[]> {
  if (cartaoIds.length === 0) return [];

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, fornecedor_original, valor, data")
    .in("cartao_id", cartaoIds)
    .gte("data", dataInicio)
    .lte("data", dataFim);
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = lancamentosRaw ?? [];
  if (lancamentos.length === 0) return [];

  const idsLancamentos = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, versao")
    .in("lancamento_id", idsLancamentos)
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const categoriaIdPorLancamento = new Map<string, string | null>();
  for (const d of decisoesRaw ?? []) {
    categoriaIdPorLancamento.set(d.lancamento_id as string, d.categoria_id as string | null);
  }

  const idsCategorias = Array.from(new Set([...categoriaIdPorLancamento.values()].filter((v): v is string => Boolean(v))));
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsCategorias.length > 0 ? idsCategorias : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorCategoria = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  return lancamentos
    .filter((l) => categoriaIdPorLancamento.has(l.id as string))
    .map((l) => ({
      fornecedor: l.fornecedor_original as string,
      valorCentavos: Math.abs(l.valor as number),
      data: l.data as string,
      categoriaRotulo: (() => {
        const catId = categoriaIdPorLancamento.get(l.id as string);
        return catId ? rotuloPorCategoria.get(catId) ?? null : null;
      })(),
    }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos)
    .slice(0, limite);
}

/**
 * Busca determinística de dados por intenção — a IA nunca "lembra" livremente
 * aqui, só o código decide o que existe. Retorna null quando não há dado
 * suficiente pra fundamentar uma resposta (vira limitação, sem chamar a API).
 */
export async function recuperarDados(intencao: IntencaoEstruturada): Promise<DadosRecuperados | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  if (intencao.intencao === "fora_de_escopo") return null;

  if (intencao.intencao === "total_categoria_periodo") {
    if (!intencao.categoriaRotulo || !intencao.dataInicio || !intencao.dataFim) return null;
    const categoriaId = await resolverCategoriaId(supabase, intencao.categoriaRotulo);
    if (!categoriaId) return null;
    const dados = await carregarDadosDashboard({ dataInicio: intencao.dataInicio, dataFim: intencao.dataFim, categoriaId });
    return {
      tipo: "total_categoria_periodo",
      categoriaRotulo: intencao.categoriaRotulo,
      dataInicio: intencao.dataInicio,
      dataFim: intencao.dataFim,
      totalCentavos: dados.totalPeriodo,
      totalLancamentos: dados.totalLancamentos,
    };
  }

  if (intencao.intencao === "comparacao_periodos") {
    if (!intencao.periodoAInicio || !intencao.periodoAFim || !intencao.periodoBInicio || !intencao.periodoBFim) return null;
    const categoriaId = intencao.categoriaRotulo ? await resolverCategoriaId(supabase, intencao.categoriaRotulo) : undefined;
    if (intencao.categoriaRotulo && !categoriaId) return null;
    const [dadosA, dadosB] = await Promise.all([
      carregarDadosDashboard({ dataInicio: intencao.periodoAInicio, dataFim: intencao.periodoAFim, categoriaId: categoriaId ?? undefined }),
      carregarDadosDashboard({ dataInicio: intencao.periodoBInicio, dataFim: intencao.periodoBFim, categoriaId: categoriaId ?? undefined }),
    ]);
    return {
      tipo: "comparacao_periodos",
      categoriaRotulo: intencao.categoriaRotulo,
      periodoA: { inicio: intencao.periodoAInicio, fim: intencao.periodoAFim, totalCentavos: dadosA.totalPeriodo, totalLancamentos: dadosA.totalLancamentos },
      periodoB: { inicio: intencao.periodoBInicio, fim: intencao.periodoBFim, totalCentavos: dadosB.totalPeriodo, totalLancamentos: dadosB.totalLancamentos },
    };
  }

  if (intencao.intencao === "maiores_despesas") {
    if (!intencao.dataInicio || !intencao.dataFim) return null;
    const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
    const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
    const despesas = await buscarMaioresDespesas(supabase, cartaoIds, intencao.dataInicio, intencao.dataFim, intencao.limite ?? 5);
    return { tipo: "maiores_despesas", dataInicio: intencao.dataInicio, dataFim: intencao.dataFim, despesas };
  }

  if (intencao.intencao === "resumo_insights_competencia") {
    if (!intencao.mesReferencia) return null;
    const competenciaId = await resolverCompetenciaId(supabase, perfilId, intencao.mesReferencia);
    if (!competenciaId) return null;
    const { insights, recomendacoes } = await carregarInsightsDaCompetencia(competenciaId);
    return { tipo: "resumo_insights_competencia", mesReferencia: intencao.mesReferencia, competenciaId, insights, recomendacoes };
  }

  if (intencao.intencao === "resumo_relatorio") {
    if (!intencao.mesReferencia) return null;
    const competenciaId = await resolverCompetenciaId(supabase, perfilId, intencao.mesReferencia);
    if (!competenciaId) return null;
    const versaoId = await carregarVersaoVigentePorCompetencia(competenciaId);
    if (!versaoId) return null;
    const versao = await carregarRelatorioVersao(versaoId);
    if (!versao) return null;
    return {
      tipo: "resumo_relatorio",
      mesReferencia: intencao.mesReferencia,
      versaoId,
      conteudoHtmlSemObjetivos: removerSecaoObjetivos(versao.conteudoHtml),
      metodologia: versao.metodologia,
    };
  }

  return null;
}
