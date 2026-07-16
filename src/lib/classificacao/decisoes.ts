"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { reabrirSeFechada } from "@/lib/competencias/reabertura";
import { avaliarAprendizagem } from "@/lib/regras/aprendizagem";

async function proximaVersao(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  lancamentoId: string,
): Promise<number> {
  const { data } = await supabase
    .from("classificacao_decisoes")
    .select("versao")
    .eq("lancamento_id", lancamentoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.versao ?? 0) + 1;
}

async function registrarAuditoria(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  perfilId: string,
  entidadeTipo: string,
  entidadeId: string,
  tipoEvento: string,
  detalhe?: Record<string, unknown>,
) {
  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: entidadeTipo,
    entidade_relacionada_id: entidadeId,
    tipo_evento: tipoEvento,
    ator: "usuário",
    detalhe: detalhe ?? null,
  });
}

async function ultimaProposta(supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"], lancamentoId: string) {
  const { data } = await supabase
    .from("classificacao_propostas")
    .select("*")
    .eq("lancamento_id", lancamentoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Confirma a proposta vigente do lançamento como decisão real. */
export async function confirmarClassificacao(lancamentoId: string): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  const proposta = await ultimaProposta(supabase, lancamentoId);
  if (!proposta) throw new Error("Não há proposta de classificação para confirmar.");
  if (!proposta.categoria_id) throw new Error("A proposta não tem categoria — corrija antes de confirmar.");

  const versao = await proximaVersao(supabase, lancamentoId);
  const { error } = await supabase.from("classificacao_decisoes").insert({
    lancamento_id: lancamentoId,
    proposta_anterior_id: proposta.id,
    categoria_id: proposta.categoria_id,
    subcategoria_id: proposta.subcategoria_id,
    objetivo_id: proposta.objetivo_id,
    contexto: proposta.contexto_sugerido,
    fornecedor_id: proposta.fornecedor_sugerido_id,
    origem_da_decisao: "confirmação de sugestão",
    status: "confirmada",
    versao,
  });
  if (error) throw new Error("Falha ao gravar decisão: " + error.message);

  await supabase.from("eventos_revisao").insert({ lancamento_id: lancamentoId, tipo: "confirmou", usuario_id: user.id });
  await registrarAuditoria(supabase, perfilId, "lancamento_bruto", lancamentoId, "decisão", { status: "confirmada" });

  revalidatePath("/caixa-de-entrada");
}

export interface CorrecaoClassificacao {
  categoriaId: string;
  subcategoriaId?: string;
  objetivoId: string;
  contexto?: string;
}

export interface PadraoDivergente {
  fornecedorNormalizado: string;
  categoriaAtualId: string;
  categoriaAtualRotulo: string;
}

/**
 * Ajuste C (brainstorm 2026-07-15): antes de efetivar uma correção, verifica
 * se o fornecedor já tem um padrão estabelecido (categoria majoritária das
 * decisões anteriores) diferente da nova categoria escolhida — se sim, a UI
 * pergunta "só este / todos os passados / regra pra próximos" em vez de
 * corrigir em silêncio.
 */
export async function detectarDesvioDePadrao(lancamentoId: string, novaCategoriaId: string): Promise<PadraoDivergente | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: lancamentoAtual } = await supabase
    .from("lancamentos_brutos")
    .select("fornecedor_original")
    .eq("id", lancamentoId)
    .single();
  if (!lancamentoAtual) return null;
  const fornecedorNormalizado = (lancamentoAtual.fornecedor_original as string).trim().toUpperCase();
  if (!fornecedorNormalizado) return null;

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return null;

  const { data: lancamentosDoFornecedor } = await supabase
    .from("lancamentos_brutos")
    .select("id, fornecedor_original")
    .in("cartao_id", cartaoIds);
  const idsDoFornecedor = (lancamentosDoFornecedor ?? [])
    .filter((l) => (l.fornecedor_original as string).trim().toUpperCase() === fornecedorNormalizado && l.id !== lancamentoId)
    .map((l) => l.id as string);
  if (idsDoFornecedor.length === 0) return null;

  const { data: decisoesAnteriores } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, criado_em")
    .in("lancamento_id", idsDoFornecedor)
    .in("status", ["corrigida", "confirmada"])
    .order("criado_em", { ascending: false });
  if (!decisoesAnteriores || decisoesAnteriores.length === 0) return null;

  // Decisão vigente por lançamento = a mais recente (já ordenado desc).
  const categoriaVigentePorLancamento = new Map<string, string>();
  for (const d of decisoesAnteriores) {
    const id = d.lancamento_id as string;
    if (!categoriaVigentePorLancamento.has(id) && d.categoria_id) categoriaVigentePorLancamento.set(id, d.categoria_id as string);
  }
  if (categoriaVigentePorLancamento.size === 0) return null;

  const contagem = new Map<string, number>();
  for (const categoriaId of categoriaVigentePorLancamento.values()) contagem.set(categoriaId, (contagem.get(categoriaId) ?? 0) + 1);
  const [categoriaMajoritariaId] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];

  if (categoriaMajoritariaId === novaCategoriaId) return null;

  const { data: termo } = await supabase.from("taxonomia_termos").select("rotulo").eq("id", categoriaMajoritariaId).maybeSingle();
  if (!termo) return null;

  return {
    fornecedorNormalizado,
    categoriaAtualId: categoriaMajoritariaId,
    categoriaAtualRotulo: termo.rotulo as string,
  };
}

/**
 * Aplica a mesma correção a todos os lançamentos passados desse fornecedor
 * (opção "alteração retroativa total" do prompt de recategorização).
 * Nunca sobrescreve — cada lançamento ganha uma nova versão de decisão.
 */
export async function corrigirTodosDoFornecedor(fornecedorNormalizado: string, correcao: CorrecaoClassificacao): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  if (!correcao.categoriaId) throw new Error("Categoria não pode ficar em branco.");
  if (!correcao.objetivoId) throw new Error("Objetivo não pode ficar em branco.");

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return;

  const { data: lancamentosDoFornecedor } = await supabase
    .from("lancamentos_brutos")
    .select("id, fornecedor_original")
    .in("cartao_id", cartaoIds);
  const idsDoFornecedor = (lancamentosDoFornecedor ?? [])
    .filter((l) => (l.fornecedor_original as string).trim().toUpperCase() === fornecedorNormalizado)
    .map((l) => l.id as string);
  if (idsDoFornecedor.length === 0) return;

  for (const id of idsDoFornecedor) {
    await reabrirSeFechada(supabase, perfilId, id);
    const proposta = await ultimaProposta(supabase, id);
    const versao = await proximaVersao(supabase, id);
    const { error } = await supabase.from("classificacao_decisoes").insert({
      lancamento_id: id,
      proposta_anterior_id: proposta?.id ?? null,
      categoria_id: correcao.categoriaId,
      subcategoria_id: correcao.subcategoriaId ?? null,
      objetivo_id: correcao.objetivoId,
      contexto: correcao.contexto ?? null,
      fornecedor_id: proposta?.fornecedor_sugerido_id ?? null,
      origem_da_decisao: "manual",
      status: "corrigida",
      versao,
    });
    if (error) throw new Error("Falha ao corrigir lançamento em lote: " + error.message);

    await supabase.from("eventos_revisao").insert({ lancamento_id: id, tipo: "alterou", usuario_id: user.id });
    await registrarAuditoria(supabase, perfilId, "lancamento_bruto", id, "decisão", { status: "corrigida", origem: "recategorizacao_retroativa" });
  }

  revalidatePath("/caixa-de-entrada");
  revalidatePath("/historico");
}

/**
 * Tópico B (brainstorm 3): edição na Revisão em Lote — aplica a mesma
 * correção a um conjunto explícito de lançamentos (o grupo selecionado no
 * painel), em vez de aceitar a proposta da IA como estava. Nunca sobrescreve
 * — cada lançamento ganha uma nova versão de decisão.
 */
export async function corrigirLote(ids: string[], correcao: CorrecaoClassificacao): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  if (!correcao.categoriaId) throw new Error("Categoria não pode ficar em branco.");
  if (!correcao.objetivoId) throw new Error("Objetivo não pode ficar em branco.");
  if (ids.length === 0) return;

  for (const id of ids) {
    await reabrirSeFechada(supabase, perfilId, id);
    const proposta = await ultimaProposta(supabase, id);
    const versao = await proximaVersao(supabase, id);
    const { error } = await supabase.from("classificacao_decisoes").insert({
      lancamento_id: id,
      proposta_anterior_id: proposta?.id ?? null,
      categoria_id: correcao.categoriaId,
      subcategoria_id: correcao.subcategoriaId ?? null,
      objetivo_id: correcao.objetivoId,
      contexto: correcao.contexto ?? null,
      fornecedor_id: proposta?.fornecedor_sugerido_id ?? null,
      origem_da_decisao: "manual",
      status: "corrigida",
      versao,
    });
    if (error) throw new Error("Falha ao corrigir lançamento em lote: " + error.message);

    await supabase.from("eventos_revisao").insert({ lancamento_id: id, tipo: "alterou", usuario_id: user.id });
    await registrarAuditoria(supabase, perfilId, "lancamento_bruto", id, "decisão", { status: "corrigida", origem: "revisao_em_lote" });
  }

  revalidatePath("/caixa-de-entrada");
  revalidatePath("/historico");
}

/** Grava uma correção manual (usuário alterou categoria/subcategoria/objetivo/contexto em relação à proposta). */
export async function corrigirClassificacao(lancamentoId: string, correcao: CorrecaoClassificacao): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  if (!correcao.categoriaId) throw new Error("Categoria não pode ficar em branco.");
  if (!correcao.objetivoId) throw new Error("Objetivo não pode ficar em branco.");

  await reabrirSeFechada(supabase, perfilId, lancamentoId);

  const proposta = await ultimaProposta(supabase, lancamentoId);

  const versao = await proximaVersao(supabase, lancamentoId);
  const { data: decisao, error } = await supabase
    .from("classificacao_decisoes")
    .insert({
      lancamento_id: lancamentoId,
      proposta_anterior_id: proposta?.id ?? null,
      categoria_id: correcao.categoriaId,
      subcategoria_id: correcao.subcategoriaId ?? null,
      objetivo_id: correcao.objetivoId,
      contexto: correcao.contexto ?? null,
      fornecedor_id: proposta?.fornecedor_sugerido_id ?? null,
      origem_da_decisao: "manual",
      status: "corrigida",
      versao,
    })
    .select()
    .single();
  if (error || !decisao) throw new Error("Falha ao gravar correção: " + (error?.message ?? "erro desconhecido"));

  await supabase.from("eventos_revisao").insert({ lancamento_id: lancamentoId, tipo: "alterou", usuario_id: user.id });
  await registrarAuditoria(supabase, perfilId, "lancamento_bruto", lancamentoId, "decisão", { status: "corrigida" });

  // Agente de Aprendizagem (Fase 4) — supplementary: uma falha aqui não deve
  // reverter a correção, que já está commitada no banco.
  try {
    await avaliarAprendizagem(supabase, perfilId, lancamentoId, decisao.id as string, correcao.categoriaId, correcao.objetivoId);
  } catch (e) {
    console.error("Falha ao avaliar aprendizagem (Fase 4):", e);
  }

  revalidatePath("/caixa-de-entrada");
}

/** Grava só o contexto (texto livre), preservando categoria/subcategoria/objetivo vigentes. */
export async function adicionarContexto(lancamentoId: string, contexto: string): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  if (!contexto.trim()) throw new Error("Informe o contexto.");

  await reabrirSeFechada(supabase, perfilId, lancamentoId);

  const proposta = await ultimaProposta(supabase, lancamentoId);
  if (!proposta?.categoria_id) throw new Error("A proposta não tem categoria — corrija a classificação antes de adicionar contexto.");

  const versao = await proximaVersao(supabase, lancamentoId);
  const { error } = await supabase.from("classificacao_decisoes").insert({
    lancamento_id: lancamentoId,
    proposta_anterior_id: proposta.id,
    categoria_id: proposta.categoria_id,
    subcategoria_id: proposta.subcategoria_id,
    objetivo_id: proposta.objetivo_id,
    contexto: contexto.trim(),
    fornecedor_id: proposta.fornecedor_sugerido_id,
    origem_da_decisao: "manual",
    status: "parcialmente corrigida",
    versao,
  });
  if (error) throw new Error("Falha ao gravar contexto: " + error.message);

  await supabase.from("eventos_revisao").insert({ lancamento_id: lancamentoId, tipo: "contexto", usuario_id: user.id });
  await registrarAuditoria(supabase, perfilId, "lancamento_bruto", lancamentoId, "decisão", { status: "parcialmente corrigida" });

  revalidatePath("/caixa-de-entrada");
}

/** Marca o lançamento como exceção — não segue a regra/padrão geral do fornecedor, sem alterá-lo. */
export async function marcarExcecao(lancamentoId: string, motivo: string): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  if (!motivo.trim()) throw new Error("Informe o motivo da exceção.");

  await reabrirSeFechada(supabase, perfilId, lancamentoId);

  const proposta = await ultimaProposta(supabase, lancamentoId);

  const versao = await proximaVersao(supabase, lancamentoId);
  const { error: errDecisao } = await supabase.from("classificacao_decisoes").insert({
    lancamento_id: lancamentoId,
    proposta_anterior_id: proposta?.id ?? null,
    categoria_id: proposta?.categoria_id ?? null,
    subcategoria_id: proposta?.subcategoria_id ?? null,
    objetivo_id: proposta?.objetivo_id ?? null,
    contexto: proposta?.contexto_sugerido ?? null,
    fornecedor_id: proposta?.fornecedor_sugerido_id ?? null,
    origem_da_decisao: "manual",
    status: "exceção",
    versao,
  });
  if (errDecisao) throw new Error("Falha ao gravar exceção: " + errDecisao.message);

  const { error: errExcecao } = await supabase.from("excecoes").insert({ lancamento_id: lancamentoId, motivo: motivo.trim() });
  if (errExcecao) throw new Error("Falha ao gravar motivo da exceção: " + errExcecao.message);

  await supabase.from("eventos_revisao").insert({ lancamento_id: lancamentoId, tipo: "exceção", usuario_id: user.id });
  await registrarAuditoria(supabase, perfilId, "lancamento_bruto", lancamentoId, "decisão", { status: "exceção" });

  revalidatePath("/caixa-de-entrada");
}
