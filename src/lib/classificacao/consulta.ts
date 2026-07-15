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
  objetivos: { id: string; rotulo: string }[];
  lancamentosSemProposta: number;
}

const VAZIO: CaixaDeEntradaDados = { itens: [], rotulos: {}, categorias: [], objetivos: [], lancamentosSemProposta: 0 };

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
  ] = await Promise.all([
    supabase.from("classificacao_propostas").select("*").in("lancamento_id", idsLancamentos).order("criado_em", { ascending: false }),
    carregarTaxonomia(supabase),
    supabase.from("fornecedores_padronizados").select("id, nome_oficial, comportamento_contextual"),
    supabase.from("possiveis_duplicatas").select("lancamento_a_id, lancamento_b_id").eq("status", "pendente"),
    supabase.from("classificacao_decisoes").select("lancamento_id").in("lancamento_id", idsLancamentos),
  ]);
  if (errP) throw new Error("Falha ao carregar propostas de classificação: " + errP.message);
  if (errF) throw new Error("Falha ao carregar fornecedores padronizados: " + errF.message);
  if (errD) throw new Error("Falha ao carregar possíveis duplicatas: " + errD.message);
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  // Um lançamento com decisão já gravada não é mais "pendente" — essa é a
  // definição real agora (BE-4), substituindo o estado local por sessão do BE-3.
  const lancamentosComDecisao = new Set((decisoesRaw ?? []).map((d) => d.lancamento_id as string));

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
    chaveGrupo: string;
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

    const tiposPendencia: TipoPendencia[] = [];
    if (proposta.confiancaGeral < 0.6) tiposPendencia.push("baixa confiança");
    if (!fornecedorSugeridoId) tiposPendencia.push("fornecedor desconhecido");
    if (fornecedorSugeridoId && fornecedorInfo.get(fornecedorSugeridoId)?.contextual) tiposPendencia.push("fornecedor ambíguo");
    if (contextoSugerido) tiposPendencia.push("contexto necessário");
    if (lancamentosComDuplicidade.has(l.id as string)) tiposPendencia.push("duplicidade");

    const chaveGrupo = `${fornecedorSugeridoId ?? "?"}|${categoriaId ?? "?"}|${subcategoriaId ?? "?"}|${objetivoId ?? "?"}`;

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
  for (const { chaveGrupo } of construidos) contagemPorChave.set(chaveGrupo, (contagemPorChave.get(chaveGrupo) ?? 0) + 1);

  const itens = construidos.map(({ item, chaveGrupo }) => ({
    ...item,
    grupoLoteId: (contagemPorChave.get(chaveGrupo) ?? 0) >= 2 ? chaveGrupo : undefined,
  }));

  const categorias = taxonomia.filter((t) => t.dimensao === "categoria").map((t) => ({ id: t.id, rotulo: t.rotulo }));
  const objetivos = taxonomia.filter((t) => t.dimensao === "objetivo").map((t) => ({ id: t.id, rotulo: t.rotulo }));

  return { itens, rotulos, categorias, objetivos, lancamentosSemProposta: semProposta };
}
