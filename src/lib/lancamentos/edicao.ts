"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { reabrirSeFechada } from "@/lib/competencias/reabertura";
import { corrigirClassificacao } from "@/lib/classificacao/decisoes";
import { calcularCompetencia, calcularIdentificadorDeduplicacao } from "@/lib/import/parse";

export interface EdicaoLancamento {
  cartaoId: string;
  data: string;
  competencia: string;
  fornecedor: string;
  descricao: string;
  /** Em reais, positivo (convertido internamente para centavos negativos). */
  valorReais: number;
  categoriaId: string;
  subcategoriaId?: string;
  objetivoId: string;
  contexto?: string;
}

function revalidarAcervo(): void {
  revalidatePath("/competencias");
  revalidatePath("/historico");
  revalidatePath("/dashboards");
  revalidatePath("/caixa-de-entrada");
  revalidatePath("/");
}

/**
 * ADR-005: "exclui" um lançamento sem violar a imutabilidade (RUL-1). A linha
 * bruta é preservada; uma marcação append-only em `lancamentos_correcoes` a
 * esconde de todas as telas/relatórios. Reabre a competência se estava fechada.
 */
export async function excluirLancamento(lancamentoId: string, motivo?: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: original, error: errBusca } = await supabase
    .from("lancamentos_brutos")
    .select("id")
    .eq("id", lancamentoId)
    .maybeSingle();
  if (errBusca) throw new Error("Falha ao localizar lançamento: " + errBusca.message);
  if (!original) throw new Error("Lançamento não encontrado.");

  const { error } = await supabase.from("lancamentos_correcoes").insert({
    perfil_id: perfilId,
    lancamento_original_id: lancamentoId,
    lancamento_substituto_id: null,
    tipo: "exclusao",
    motivo: motivo?.trim() || null,
  });
  if (error) throw new Error("Falha ao excluir lançamento: " + error.message);

  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: "lancamento_bruto",
    entidade_relacionada_id: lancamentoId,
    tipo_evento: "exclusão",
    ator: "usuário",
    detalhe: motivo?.trim() ? { motivo: motivo.trim() } : null,
  });

  await reabrirSeFechada(supabase, perfilId, lancamentoId);
  revalidarAcervo();
}

/**
 * ADR-005: "edita" um lançamento. Classificação (categoria/subcategoria/
 * objetivo/contexto) é sempre versionada em `classificacao_decisoes`. Se algum
 * campo BRUTO mudou (fonte/data/competência/fornecedor/descrição/valor), cria
 * uma NOVA versão do lançamento (linha `lancamentos_brutos` origem='correcao')
 * com os valores corrigidos e a classificação escolhida, e marca a original
 * como substituída — nunca altera a linha original (RUL-1).
 */
export async function editarLancamento(lancamentoId: string, edicao: EdicaoLancamento, motivo?: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const fornecedor = edicao.fornecedor.trim();
  const descricao = edicao.descricao.trim() || fornecedor;
  if (!edicao.cartaoId || !edicao.data || !fornecedor || !edicao.categoriaId || !edicao.objetivoId) {
    throw new Error("Preencha fonte, data, fornecedor, categoria e objetivo.");
  }
  if (!Number.isFinite(edicao.valorReais) || edicao.valorReais <= 0) {
    throw new Error("Informe um valor válido, maior que zero.");
  }
  const competencia = /^\d{4}-\d{2}$/.test(edicao.competencia) ? edicao.competencia : calcularCompetencia(edicao.data);
  const valorCentavos = -Math.round(edicao.valorReais * 100);

  const { data: original, error: errBusca } = await supabase
    .from("lancamentos_brutos")
    .select("id, cartao_id, data, competencia_calculada, fornecedor_original, descricao_original, valor, moeda, vencimento, parcela_atual, total_parcelas")
    .eq("id", lancamentoId)
    .maybeSingle();
  if (errBusca) throw new Error("Falha ao localizar lançamento: " + errBusca.message);
  if (!original) throw new Error("Lançamento não encontrado.");

  const camposBrutosAlterados: string[] = [];
  if (original.cartao_id !== edicao.cartaoId) camposBrutosAlterados.push("fonte");
  if (original.data !== edicao.data) camposBrutosAlterados.push("data");
  if (original.competencia_calculada !== competencia) camposBrutosAlterados.push("competencia");
  if (original.fornecedor_original !== fornecedor) camposBrutosAlterados.push("fornecedor");
  if (original.descricao_original !== descricao) camposBrutosAlterados.push("descricao");
  if ((original.valor as number) !== valorCentavos) camposBrutosAlterados.push("valor");

  // Caminho 1: só a classificação (ou nada) mudou — versiona a decisão via o
  // mesmo caminho da Caixa de Entrada, sem tocar no bruto.
  if (camposBrutosAlterados.length === 0) {
    await corrigirClassificacao(lancamentoId, {
      categoriaId: edicao.categoriaId,
      subcategoriaId: edicao.subcategoriaId,
      objetivoId: edicao.objetivoId,
      contexto: edicao.contexto,
    });
    revalidarAcervo();
    return;
  }

  // Caminho 2: campo bruto mudou — nova versão do lançamento.
  const idDedup = calcularIdentificadorDeduplicacao({
    data: edicao.data,
    valor: valorCentavos,
    fornecedorOriginal: fornecedor,
    cartaoId: edicao.cartaoId,
  });

  const { data: novo, error: errNovo } = await supabase
    .from("lancamentos_brutos")
    .insert({
      cartao_id: edicao.cartaoId,
      competencia_calculada: competencia,
      data: edicao.data,
      vencimento: original.vencimento,
      fornecedor_original: fornecedor,
      descricao_original: descricao,
      valor: valorCentavos,
      moeda: original.moeda ?? "BRL",
      parcela_atual: original.parcela_atual,
      total_parcelas: original.total_parcelas,
      origem: "correcao",
      identificador_deduplicacao: idDedup,
    })
    .select("id")
    .single();
  if (errNovo || !novo) throw new Error("Falha ao gravar correção: " + (errNovo?.message ?? "erro desconhecido"));

  const { error: errDecisao } = await supabase.from("classificacao_decisoes").insert({
    lancamento_id: novo.id,
    proposta_anterior_id: null,
    categoria_id: edicao.categoriaId,
    subcategoria_id: edicao.subcategoriaId ?? null,
    objetivo_id: edicao.objetivoId,
    contexto: edicao.contexto ?? null,
    origem_da_decisao: "manual",
    status: "confirmada",
    versao: 1,
  });
  if (errDecisao) throw new Error("Falha ao gravar classificação da correção: " + errDecisao.message);

  const { error: errMarcacao } = await supabase.from("lancamentos_correcoes").insert({
    perfil_id: perfilId,
    lancamento_original_id: lancamentoId,
    lancamento_substituto_id: novo.id,
    tipo: "correcao",
    motivo: motivo?.trim() || null,
  });
  if (errMarcacao) throw new Error("Falha ao registrar correção: " + errMarcacao.message);

  // Auditoria: só os NOMES dos campos alterados, nunca os valores (política de segurança).
  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: "lancamento_bruto",
    entidade_relacionada_id: lancamentoId,
    tipo_evento: "alteração",
    ator: "usuário",
    detalhe: { substitutoId: novo.id, camposAlterados: camposBrutosAlterados },
  });

  // Reabre competência antiga e nova, se fechadas (a original pode mudar de mês).
  await reabrirSeFechada(supabase, perfilId, lancamentoId);
  await reabrirSeFechada(supabase, perfilId, novo.id as string);
  revalidarAcervo();
}
