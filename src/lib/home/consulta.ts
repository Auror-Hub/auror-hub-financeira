import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { carregarInsightsDaCompetencia } from "@/lib/analise/consulta";
import { carregarRelatorios } from "@/lib/relatorios/consulta";
import { variacaoPercentual } from "@/lib/analise/motor";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import { carregarLancamentosComCategoria } from "@/lib/lancamentos/porCategoria";
import { carregarMetas } from "@/lib/metas/consulta";
import { gerarAlerta } from "@/lib/metas/avaliacao";
import { diasRestantesNoMes } from "@/lib/data/competencia";
import { limiteInicioDoDia } from "@/lib/data/limites";
import type { AnoMes, Centavos, Competencia, DataHoraISO, Insight, Recomendacao } from "@/lib/domain/types";

const LIMIAR_VARIACAO_CATEGORIA = 0.1;
const MULTIPLICADOR_DESPESA_EXTRAORDINARIA = 2;
const MAX_COMPETENCIAS_ANTERIORES = 3;
const MAX_DESPESAS_EXTRAORDINARIAS = 3;
const MAX_CATEGORIAS_PRESSIONADAS = 3;

export interface DespesaExtraordinaria {
  descricao: string;
  fornecedor: string;
  valor: Centavos;
}

export interface CategoriaPressionadaHome {
  rotulo: string;
  variacao: number;
}

export interface AlertaHome {
  tom: "atenção" | "risco";
  texto: string;
}

export interface RelatorioResumoHome {
  competenciaLabel: string;
  versaoId: string;
}

export interface ResumoHome {
  competencia: Competencia;
  totalAnalisado: Centavos;
  quantidadeLancamentos: number;
  itensAguardandoRevisao: number;
  /** Fração vs. média das até 3 competências fechadas anteriores. null = sem histórico suficiente pra comparar. */
  variacaoVsMedia: number | null;
  /** Dias até o fim do mês civil da competência atual. null quando a competência atual não é o mês corrente real. */
  diasRestantes: number | null;
  /** criado_em mais recente entre os lançamentos da competência atual — indicador de frescor do dado. null sem lançamentos. */
  ultimaAtualizacao: DataHoraISO | null;
  narrativaPrincipal: string;
  /** Presente só quando insights/recomendações vêm de uma competência diferente da atual (atual ainda aberta). */
  mesReferenciaAnalise?: AnoMes;
  principaisMudancas: Insight[];
  recomendacaoDestaque: Recomendacao | null;
  despesasExtraordinarias: DespesaExtraordinaria[];
  categoriasPressionadas: CategoriaPressionadaHome[];
  /** Gasto por categoria da competência atual (para a pizza simplificada da Home), maior primeiro. */
  distribuicaoCategorias: { rotulo: string; total: number }[];
  alertas: AlertaHome[];
  /** Agregador de pendências (Fase 1, ADR-007): total de sinais que pedem ação hoje — mesma contagem de `alertas`. */
  totalPendencias: number;
  recomendacoes: Recomendacao[];
  ultimoRelatorio?: RelatorioResumoHome;
}

/**
 * Home (SCR-HOME-001) com dado real. "Competência atual" = a de mes_referencia
 * mais recente, esteja fechada ou não. Insights/recomendações/narrativa só
 * existem depois de fechada (Fase 6/7) — se a atual ainda está aberta, usa a
 * última fechada anterior como referência e sinaliza isso via
 * `mesReferenciaAnalise`. Despesas extraordinárias/categorias pressionadas são
 * cálculo determinístico novo, vivo, não persistido — vazio quando não há
 * histórico suficiente pra comparar (nunca inventa tendência sem base).
 */
export async function carregarResumoHome(): Promise<ResumoHome | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const competencias = await carregarCompetencias();
  if (competencias.length === 0) return null;

  const atual = competencias[0];
  const fechadasAnteriores = competencias
    .slice(1)
    .filter((c) => c.competencia.estado === "fechada" || c.competencia.estado === "reaberta")
    .slice(0, MAX_COMPETENCIAS_ANTERIORES);

  const atualFechada = atual.competencia.estado === "fechada" || atual.competencia.estado === "reaberta";
  const referenciaAnalise = atualFechada ? atual : fechadasAnteriores[0];

  let principaisMudancas: Insight[] = [];
  let recomendacoes: Recomendacao[] = [];
  if (referenciaAnalise) {
    const { insights, recomendacoes: recs } = await carregarInsightsDaCompetencia(referenciaAnalise.competencia.id);
    principaisMudancas = insights;
    recomendacoes = recs;
  }

  // Rearquitetura (Fase 1, ADR-007): recomendação única destacada — a primeira
  // ainda não decidida ("aceitou"/"não sugerir de novo" suprimem pra sempre;
  // "agora não" suprime só até o fim do dia calendário, mesmo padrão de
  // "revisar depois" da Caixa de Entrada).
  let recomendacaoDestaque: Recomendacao | null = null;
  if (recomendacoes.length > 0) {
    const inicioHoje = limiteInicioDoDia(new Date());
    const { data: decisoesRaw } = await supabase
      .from("recomendacoes_decisoes")
      .select("recomendacao_id, decisao, criado_em")
      .in("recomendacao_id", recomendacoes.map((r) => r.id));
    const suprimidas = new Set<string>();
    for (const d of decisoesRaw ?? []) {
      const decisao = d.decisao as string;
      const recomendacaoId = d.recomendacao_id as string;
      if (decisao === "aceitou" || decisao === "não sugerir de novo") {
        suprimidas.add(recomendacaoId);
      } else if (decisao === "agora não" && new Date(d.criado_em as string) >= inicioHoje) {
        suprimidas.add(recomendacaoId);
      }
    }
    recomendacaoDestaque = recomendacoes.find((r) => !suprimidas.has(r.id)) ?? null;
  }

  const insightVariacaoTotal = principaisMudancas.find((i) => i.tipo === "variacao_total");
  const narrativaPrincipal = insightVariacaoTotal
    ? insightVariacaoTotal.explicacao
    : atual.lancamentosPendentes > 0
      ? `${atual.totalLancamentos} lançamentos registrados nesta competência, ${atual.lancamentosPendentes} aguardando revisão.`
      : `${atual.totalLancamentos} lançamentos registrados nesta competência, todos revisados.`;

  let variacaoVsMedia: number | null = null;
  if (fechadasAnteriores.length > 0) {
    const mediaAnterior = fechadasAnteriores.reduce((soma, c) => soma + c.totalConsolidado, 0) / fechadasAnteriores.length;
    variacaoVsMedia = variacaoPercentual(-atual.totalConsolidado, -mediaAnterior);
  }

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);

  const mesesAnteriores = fechadasAnteriores.map((c) => c.competencia.mesReferencia);
  const inativos = await carregarIdsInativos(supabase, perfilId);
  const [lancamentosAtual, lancamentosAnteriores] = await Promise.all([
    carregarLancamentosComCategoria(supabase, cartaoIds, [atual.competencia.mesReferencia], inativos),
    carregarLancamentosComCategoria(supabase, cartaoIds, mesesAnteriores, inativos),
  ]);

  const idsCategorias = new Set<string>();
  const somaAnteriorPorCategoria = new Map<string, number>();
  const contagemAnteriorPorCategoria = new Map<string, number>();
  for (const l of lancamentosAnteriores) {
    if (!l.categoriaId) continue;
    idsCategorias.add(l.categoriaId);
    somaAnteriorPorCategoria.set(l.categoriaId, (somaAnteriorPorCategoria.get(l.categoriaId) ?? 0) + l.valorAbs);
    contagemAnteriorPorCategoria.set(l.categoriaId, (contagemAnteriorPorCategoria.get(l.categoriaId) ?? 0) + 1);
  }
  const somaAtualPorCategoria = new Map<string, number>();
  for (const l of lancamentosAtual) {
    if (!l.categoriaId) continue;
    idsCategorias.add(l.categoriaId);
    somaAtualPorCategoria.set(l.categoriaId, (somaAtualPorCategoria.get(l.categoriaId) ?? 0) + l.valorAbs);
  }

  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsCategorias.size > 0 ? [...idsCategorias] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorCategoria = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const despesasExtraordinarias: DespesaExtraordinaria[] = fechadasAnteriores.length
    ? lancamentosAtual
        .filter((l) => {
          if (!l.categoriaId) return false;
          const contagem = contagemAnteriorPorCategoria.get(l.categoriaId) ?? 0;
          if (contagem === 0) return false;
          const mediaLancamento = (somaAnteriorPorCategoria.get(l.categoriaId) ?? 0) / contagem;
          return mediaLancamento > 0 && l.valorAbs >= mediaLancamento * MULTIPLICADOR_DESPESA_EXTRAORDINARIA;
        })
        .sort((a, b) => b.valorAbs - a.valorAbs)
        .slice(0, MAX_DESPESAS_EXTRAORDINARIAS)
        .map((l) => ({
          descricao: rotuloPorCategoria.get(l.categoriaId!) ?? "Despesa",
          fornecedor: l.fornecedor,
          valor: -l.valorAbs,
        }))
    : [];

  const categoriasPressionadas: CategoriaPressionadaHome[] = fechadasAnteriores.length
    ? [...idsCategorias]
        .map((categoriaId) => {
          const mediaMensal = (somaAnteriorPorCategoria.get(categoriaId) ?? 0) / fechadasAnteriores.length;
          const totalAtual = somaAtualPorCategoria.get(categoriaId) ?? 0;
          const variacao = mediaMensal > 0 ? variacaoPercentual(totalAtual, mediaMensal) : null;
          return { categoriaId, variacao };
        })
        // "Pressionada" = sob pressão de alta — só aumento, nunca queda (mesmo espírito do rótulo).
        .filter((c): c is { categoriaId: string; variacao: number } => c.variacao !== null && c.variacao >= LIMIAR_VARIACAO_CATEGORIA)
        .sort((a, b) => b.variacao - a.variacao)
        .slice(0, MAX_CATEGORIAS_PRESSIONADAS)
        .map((c) => ({ rotulo: rotuloPorCategoria.get(c.categoriaId) ?? "—", variacao: c.variacao }))
    : [];

  const distribuicaoCategorias = [...somaAtualPorCategoria.entries()]
    .map(([categoriaId, total]) => ({ rotulo: rotuloPorCategoria.get(categoriaId) ?? "—", total }))
    .sort((a, b) => b.total - a.total);

  const alertas: AlertaHome[] = [];
  if (atual.lancamentosPendentes > 0) {
    alertas.push({ tom: "atenção", texto: `${atual.lancamentosPendentes} lançamentos ainda aguardam sua revisão nesta competência.` });
  }

  const metas = await carregarMetas();
  const metasAtivas = metas.filter((m) => m.status === "ativa");
  for (const meta of metasAtivas) {
    const alerta = gerarAlerta(meta.rotuloCompleto, meta.valorLimiteEfetivo, meta.gastoAtual, {
      percentual: meta.percentual,
      status: meta.statusProgresso,
    });
    if (alerta) alertas.push(alerta);
  }

  const diasRestantes = diasRestantesNoMes(atual.competencia.mesReferencia, new Date());

  const { data: ultimoLancamento } = await supabase
    .from("lancamentos_brutos")
    .select("criado_em")
    .in("cartao_id", cartaoIds.length ? cartaoIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("competencia_calculada", atual.competencia.mesReferencia)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ultimaAtualizacao = (ultimoLancamento?.criado_em as string | undefined) ?? null;

  const relatorios = await carregarRelatorios();
  const ultimoRelatorio: RelatorioResumoHome | undefined = relatorios[0]
    ? { competenciaLabel: relatorios[0].mesReferencia, versaoId: relatorios[0].versaoId }
    : undefined;

  return {
    competencia: atual.competencia,
    totalAnalisado: atual.totalConsolidado,
    quantidadeLancamentos: atual.totalLancamentos,
    itensAguardandoRevisao: atual.lancamentosPendentes,
    variacaoVsMedia,
    diasRestantes,
    ultimaAtualizacao,
    narrativaPrincipal,
    mesReferenciaAnalise:
      referenciaAnalise && referenciaAnalise.competencia.id !== atual.competencia.id ? referenciaAnalise.competencia.mesReferencia : undefined,
    principaisMudancas,
    recomendacaoDestaque,
    despesasExtraordinarias,
    categoriasPressionadas,
    distribuicaoCategorias,
    alertas,
    totalPendencias: alertas.length,
    recomendacoes,
    ultimoRelatorio,
  };
}
