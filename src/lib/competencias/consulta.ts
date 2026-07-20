import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import type { Competencia, EstadoCompetencia } from "@/lib/domain/types";
import type { CompetenciaDetalhe, DocumentoOrigemResumo, VersaoFechamento } from "@/lib/domain/competency";

interface GrupoMes {
  totalLancamentos: number;
  totalConsolidado: number;
  pendentes: number;
  arquivoIds: Set<string>;
}

/**
 * Carrega todas as competências reais do perfil autenticado, com o shape de
 * detalhe (`CompetenciaDetalhe`) já pronto para as telas de lista e detalhe.
 * Linhas de `competencias` são criadas sob demanda (upsert) para cada mês
 * encontrado em `lancamentos_brutos` — não existe criação manual. `estado`
 * é recalculado dinamicamente enquanto não `fechada`/`reaberta`; essas duas
 * só mudam por ação explícita (fecharCompetencia/reabrirCompetencia).
 */
export async function carregarCompetencias(): Promise<CompetenciaDetalhe[]> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, competencia_calculada, valor, arquivo_origem_id");
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const inativos = await carregarIdsInativos(supabase, perfilId);
  const lancamentos = (lancamentosRaw ?? []).filter((l) => !inativos.has(l.id as string));
  if (lancamentos.length === 0) return [];

  const idsLancamentos = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id")
    .in("lancamento_id", idsLancamentos);
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);
  const lancamentosComDecisao = new Set((decisoesRaw ?? []).map((d) => d.lancamento_id as string));

  const porMes = new Map<string, GrupoMes>();
  for (const l of lancamentos) {
    const mes = l.competencia_calculada as string;
    const grupo = porMes.get(mes) ?? { totalLancamentos: 0, totalConsolidado: 0, pendentes: 0, arquivoIds: new Set<string>() };
    grupo.totalLancamentos++;
    grupo.totalConsolidado += l.valor as number;
    if (!lancamentosComDecisao.has(l.id as string)) grupo.pendentes++;
    if (l.arquivo_origem_id) grupo.arquivoIds.add(l.arquivo_origem_id as string);
    porMes.set(mes, grupo);
  }

  const meses = Array.from(porMes.keys());

  const { error: errUpsert } = await supabase
    .from("competencias")
    .upsert(
      meses.map((mes) => ({ perfil_id: perfilId, mes_referencia: mes })),
      { onConflict: "perfil_id,mes_referencia", ignoreDuplicates: true },
    );
  if (errUpsert) throw new Error("Falha ao sincronizar competências: " + errUpsert.message);

  const { data: competenciasRaw, error: errC } = await supabase
    .from("competencias")
    .select("id, mes_referencia, estado")
    .in("mes_referencia", meses)
    .order("mes_referencia", { ascending: false });
  if (errC) throw new Error("Falha ao carregar competências: " + errC.message);
  const competenciasRows = competenciasRaw ?? [];

  for (const c of competenciasRows) {
    const estadoAtual = c.estado as EstadoCompetencia;
    if (estadoAtual === "fechada" || estadoAtual === "reaberta") continue;
    const pendentes = porMes.get(c.mes_referencia as string)?.pendentes ?? 0;
    const novoEstado: EstadoCompetencia = pendentes > 0 ? "em revisão" : "pronta";
    if (estadoAtual !== novoEstado) {
      await supabase.from("competencias").update({ estado: novoEstado }).eq("id", c.id as string);
      c.estado = novoEstado;
    }
  }

  const idsCompetencias = competenciasRows.map((c) => c.id as string);
  const [{ data: fechamentosRaw, error: errF }, { data: arquivosRaw, error: errArq }] = await Promise.all([
    supabase
      .from("fechamentos_competencia")
      .select("competencia_id, versao, motivo_reabertura_anterior, fechado_em")
      .in("competencia_id", idsCompetencias)
      .order("versao", { ascending: true }),
    supabase.from("documentos_origem").select("id, nome_arquivo, total_declarado, cartao_id"),
  ]);
  if (errF) throw new Error("Falha ao carregar fechamentos: " + errF.message);
  if (errArq) throw new Error("Falha ao carregar documentos de origem: " + errArq.message);

  const cartaoIds = Array.from(new Set((arquivosRaw ?? []).map((a) => a.cartao_id as string)));
  const { data: cartoesRaw, error: errCartoes } =
    cartaoIds.length > 0
      ? await supabase.from("cartoes").select("id, instituicao, apelido").in("id", cartaoIds)
      : { data: [] as { id: string; instituicao: string; apelido: string | null }[], error: null };
  if (errCartoes) throw new Error("Falha ao carregar cartões: " + errCartoes.message);

  const cartaoNomePorId = new Map(
    (cartoesRaw ?? []).map((c) => [c.id as string, (c.apelido as string | null) || (c.instituicao as string)]),
  );
  const documentoPorId = new Map((arquivosRaw ?? []).map((a) => [a.id as string, a]));

  const fechamentosPorCompetencia = new Map<string, VersaoFechamento[]>();
  for (const f of fechamentosRaw ?? []) {
    const id = f.competencia_id as string;
    const lista = fechamentosPorCompetencia.get(id) ?? [];
    lista.push({
      versao: f.versao as number,
      motivoReaberturaAnterior: (f.motivo_reabertura_anterior as string | null) ?? undefined,
      fechadoEm: f.fechado_em as string,
    });
    fechamentosPorCompetencia.set(id, lista);
  }

  return competenciasRows.map((c) => {
    const mes = c.mes_referencia as string;
    const grupo = porMes.get(mes)!;
    const versoesFechamento = fechamentosPorCompetencia.get(c.id as string) ?? [];

    const documentos: DocumentoOrigemResumo[] = Array.from(grupo.arquivoIds)
      .map((arquivoId) => documentoPorId.get(arquivoId))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        nomeArquivo: d.nome_arquivo as string,
        cartaoNome: cartaoNomePorId.get(d.cartao_id as string) ?? "—",
        totalDeclarado: (d.total_declarado as number | null) ?? 0,
      }));

    const competencia: Competencia = { id: c.id as string, mesReferencia: mes, estado: c.estado as EstadoCompetencia };

    return {
      competencia,
      documentos,
      totalLancamentos: grupo.totalLancamentos,
      lancamentosRevisados: grupo.totalLancamentos - grupo.pendentes,
      lancamentosPendentes: grupo.pendentes,
      totalConsolidado: grupo.totalConsolidado,
      insights: [],
      recomendacoes: [],
      versoesFechamento,
      relatorioDisponivel: versoesFechamento.length > 0,
    };
  });
}

/** Atalho para o detalhe de uma única competência (usado por `/competencias/[id]`). */
export async function carregarCompetenciaDetalhe(id: string): Promise<CompetenciaDetalhe | undefined> {
  const todas = await carregarCompetencias();
  return todas.find((d) => d.competencia.id === id);
}

/**
 * `criado_em` mais recente entre os lançamentos de uma competência —
 * indicador de frescor (Fase 5, Auditoria V2: `classificarFrescor` em
 * `src/lib/data/frescor.ts`). null quando não há lançamento nenhum no mês.
 */
export async function carregarUltimaAtualizacaoCompetencia(mesReferencia: string): Promise<string | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return null;

  const { data: ultimoLancamento } = await supabase
    .from("lancamentos_brutos")
    .select("criado_em")
    .in("cartao_id", cartaoIds)
    .eq("competencia_calculada", mesReferencia)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (ultimoLancamento?.criado_em as string | undefined) ?? null;
}
