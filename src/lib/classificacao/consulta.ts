import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarTaxonomia } from "./taxonomia";
import type { ItemFila, TipoPendencia } from "@/lib/domain/inbox";
import type { LancamentoBruto, PropostaClassificacao } from "@/lib/domain/types";

export interface CaixaDeEntradaDados {
  itens: ItemFila[];
  /** taxonomia_termos.id e fornecedores_padronizados.id → rótulo, pra exibição. */
  rotulos: Record<string, string>;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
  lancamentosSemProposta: number;
}

const VAZIO: CaixaDeEntradaDados = {
  itens: [],
  rotulos: {},
  categorias: [],
  subcategoriasPorCategoria: {},
  objetivos: [],
  lancamentosSemProposta: 0,
};

/** Carrega os lançamentos reais + a proposta de classificação mais recente de cada um, pra Caixa de Entrada. */
export async function carregarCaixaDeEntrada(): Promise<CaixaDeEntradaDados> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select(
      "id, lote_importacao_id, cartao_id, competencia_calculada, data, vencimento, fornecedor_original, descricao_original, valor, parcela_atual, total_parcelas, moeda, arquivo_origem_id, pagina_ou_posicao, identificador_deduplicacao, origem",
    )
    .order("data", { ascending: false });
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);

  const lancamentosRows = lancamentosRaw ?? [];
  if (lancamentosRows.length === 0) return VAZIO;

  const idsLancamentos = lancamentosRows.map((l) => l.id as string);

  const [
    { data: propostasRaw, error: errP },
    taxonomia,
    { data: fornecedoresRaw, error: errF },
    { data: duplicatasRaw, error: errD },
    { data: decisoesRaw, error: errDec },
    { data: decisoesHistoricoRaw, error: errDecHist },
  ] = await Promise.all([
    supabase.from("classificacao_propostas").select("*").in("lancamento_id", idsLancamentos).order("criado_em", { ascending: false }),
    carregarTaxonomia(supabase),
    supabase.from("fornecedores_padronizados").select("id, nome_oficial, comportamento_contextual"),
    supabase.from("possiveis_duplicatas").select("lancamento_a_id, lancamento_b_id").eq("status", "pendente"),
    supabase.from("classificacao_decisoes").select("lancamento_id").in("lancamento_id", idsLancamentos),
    // Tópico B (brainstorm 3): histórico completo de decisões, pra detectar
    // fornecedores que já oscilaram de categoria no passado (postos de
    // gasolina que às vezes são almoço, etc.) — esses nunca entram em
    // agrupamento de revisão em lote, sempre caem pra revisão individual.
    supabase
      .from("classificacao_decisoes")
      .select("lancamento_id, categoria_id, status, criado_em")
      .in("lancamento_id", idsLancamentos)
      .in("status", ["confirmada", "corrigida"])
      .order("criado_em", { ascending: false }),
  ]);
  if (errP) throw new Error("Falha ao carregar propostas de classificação: " + errP.message);
  if (errF) throw new Error("Falha ao carregar fornecedores padronizados: " + errF.message);
  if (errD) throw new Error("Falha ao carregar possíveis duplicatas: " + errD.message);
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);
  if (errDecHist) throw new Error("Falha ao carregar histórico de decisões: " + errDecHist.message);

  // Um lançamento com decisão já gravada não é mais "pendente" — essa é a
  // definição real agora (BE-4), substituindo o estado local por sessão do BE-3.
  const lancamentosComDecisao = new Set((decisoesRaw ?? []).map((d) => d.lancamento_id as string));

  // Tópico B: fornecedor normalizado → categorias distintas já decididas no
  // passado (decisão vigente = a mais recente por lançamento, já ordenado desc).
  const fornecedorOriginalPorLancamento = new Map(lancamentosRows.map((l) => [l.id as string, l.fornecedor_original as string]));
  const categoriaVigentePorLancamento = new Map<string, string>();
  for (const d of decisoesHistoricoRaw ?? []) {
    const id = d.lancamento_id as string;
    if (!categoriaVigentePorLancamento.has(id) && d.categoria_id) categoriaVigentePorLancamento.set(id, d.categoria_id as string);
  }
  const categoriasPorFornecedorNormalizado = new Map<string, Set<string>>();
  for (const [lancamentoId, categoriaId] of categoriaVigentePorLancamento) {
    const fornecedorOriginal = fornecedorOriginalPorLancamento.get(lancamentoId);
    if (!fornecedorOriginal) continue;
    const normalizado = fornecedorOriginal.trim().toUpperCase();
    const set = categoriasPorFornecedorNormalizado.get(normalizado) ?? new Set<string>();
    set.add(categoriaId);
    categoriasPorFornecedorNormalizado.set(normalizado, set);
  }
  const fornecedoresAmbiguosPorHistorico = new Set(
    [...categoriasPorFornecedorNormalizado.entries()].filter(([, categorias]) => categorias.size >= 2).map(([normalizado]) => normalizado),
  );

  // A proposta vigente de cada lançamento é a mais recente (já vem ordenado desc).
  const propostaPorLancamento = new Map<string, NonNullable<typeof propostasRaw>[number]>();
  for (const p of propostasRaw ?? []) {
    const id = p.lancamento_id as string;
    if (!propostaPorLancamento.has(id)) propostaPorLancamento.set(id, p);
  }

  const lancamentosComDuplicidade = new Set<string>();
  for (const d of duplicatasRaw ?? []) {
    lancamentosComDuplicidade.add(d.lancamento_a_id as string);
    lancamentosComDuplicidade.add(d.lancamento_b_id as string);
  }

  const fornecedorInfo = new Map(
    (fornecedoresRaw ?? []).map((f) => [f.id as string, { nome: f.nome_oficial as string, contextual: f.comportamento_contextual as boolean }]),
  );

  const rotulos: Record<string, string> = {};
  for (const t of taxonomia) rotulos[t.id] = t.rotulo;
  for (const [id, info] of fornecedorInfo) rotulos[id] = info.nome;

  interface ItemComChave {
    item: ItemFila;
    chaveGrupo: string | undefined;
  }
  const construidos: ItemComChave[] = [];
  let semProposta = 0;

  for (const l of lancamentosRows) {
    if (lancamentosComDecisao.has(l.id as string)) continue;

    const propostaRow = propostaPorLancamento.get(l.id as string);
    if (!propostaRow) {
      semProposta++;
      continue;
    }

    const lancamento: LancamentoBruto = {
      id: l.id as string,
      loteImportacaoId: (l.lote_importacao_id as string | null) ?? undefined,
      cartaoId: l.cartao_id as string,
      competenciaCalculada: l.competencia_calculada as string,
      data: l.data as string,
      vencimento: (l.vencimento as string | null) ?? undefined,
      fornecedorOriginal: l.fornecedor_original as string,
      descricaoOriginal: l.descricao_original as string,
      valor: l.valor as number,
      parcelaAtual: (l.parcela_atual as number | null) ?? undefined,
      totalParcelas: (l.total_parcelas as number | null) ?? undefined,
      moeda: l.moeda as string,
      arquivoOrigemId: (l.arquivo_origem_id as string | null) ?? undefined,
      paginaOuPosicao: (l.pagina_ou_posicao as string | null) ?? undefined,
      identificadorDeduplicacao: l.identificador_deduplicacao as string,
      origem: l.origem as "importado" | "manual",
    };

    const fornecedorSugeridoId = (propostaRow.fornecedor_sugerido_id as string | null) ?? undefined;
    const categoriaId = (propostaRow.categoria_id as string | null) ?? undefined;
    const subcategoriaId = (propostaRow.subcategoria_id as string | null) ?? undefined;
    const objetivoId = (propostaRow.objetivo_id as string | null) ?? undefined;
    const contextoSugerido = (propostaRow.contexto_sugerido as string | null) || undefined;

    const proposta: PropostaClassificacao = {
      id: propostaRow.id as string,
      lancamentoId: l.id as string,
      fornecedorSugeridoId,
      dimensoes: { categoria: categoriaId, subcategoria: subcategoriaId, objetivo: objetivoId },
      contextoSugerido,
      confiancaGeral: propostaRow.confianca_geral as number,
      confiancaPorDimensao: {
        categoria: (propostaRow.confianca_categoria as number | null) ?? undefined,
        subcategoria: (propostaRow.confianca_subcategoria as number | null) ?? undefined,
        objetivo: (propostaRow.confianca_objetivo as number | null) ?? undefined,
      },
      justificativa: propostaRow.justificativa as string,
      origem: propostaRow.origem as "regra" | "llm",
      versaoClassificador: propostaRow.versao_classificador as string,
      criadoEm: propostaRow.criado_em as string,
    };

    const fornecedorNormalizado = lancamento.fornecedorOriginal.trim().toUpperCase();
    const ambiguoPorHistorico = fornecedoresAmbiguosPorHistorico.has(fornecedorNormalizado);

    const tiposPendencia: TipoPendencia[] = [];
    if (proposta.confiancaGeral < 0.6) tiposPendencia.push("baixa confiança");
    if (!fornecedorSugeridoId) tiposPendencia.push("fornecedor desconhecido");
    if (fornecedorSugeridoId && fornecedorInfo.get(fornecedorSugeridoId)?.contextual) tiposPendencia.push("fornecedor ambíguo");
    if (ambiguoPorHistorico && !tiposPendencia.includes("fornecedor ambíguo")) tiposPendencia.push("fornecedor ambíguo");
    if (contextoSugerido) tiposPendencia.push("contexto necessário");
    if (lancamentosComDuplicidade.has(l.id as string)) tiposPendencia.push("duplicidade");

    // Fornecedor que já oscilou de categoria no passado nunca entra em
    // agrupamento de revisão em lote (Tópico B) — cai sempre pra revisão
    // individual, mesmo que a proposta atual coincida com outras.
    const chaveGrupo = ambiguoPorHistorico
      ? undefined
      : `${fornecedorSugeridoId ?? "?"}|${categoriaId ?? "?"}|${subcategoriaId ?? "?"}|${objetivoId ?? "?"}`;

    construidos.push({
      item: {
        lancamento,
        proposta,
        fornecedorNomeOriginal: lancamento.fornecedorOriginal,
        tiposPendencia,
      },
      chaveGrupo,
    });
  }

  const contagemPorChave = new Map<string, number>();
  for (const { chaveGrupo } of construidos) {
    if (!chaveGrupo) continue;
    contagemPorChave.set(chaveGrupo, (contagemPorChave.get(chaveGrupo) ?? 0) + 1);
  }

  const itens = construidos.map(({ item, chaveGrupo }) => ({
    ...item,
    grupoLoteId: chaveGrupo && (contagemPorChave.get(chaveGrupo) ?? 0) >= 2 ? chaveGrupo : undefined,
  }));

  const categorias = taxonomia.filter((t) => t.dimensao === "categoria").map((t) => ({ id: t.id, rotulo: t.rotulo }));
  const objetivos = taxonomia.filter((t) => t.dimensao === "objetivo").map((t) => ({ id: t.id, rotulo: t.rotulo }));

  const subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]> = {};
  for (const t of taxonomia) {
    if (t.dimensao !== "subcategoria" || !t.termoPaiId) continue;
    const lista = subcategoriasPorCategoria[t.termoPaiId] ?? [];
    lista.push({ id: t.id, rotulo: t.rotulo });
    subcategoriasPorCategoria[t.termoPaiId] = lista;
  }

  return { itens, rotulos, categorias, subcategoriasPorCategoria, objetivos, lancamentosSemProposta: semProposta };
}
