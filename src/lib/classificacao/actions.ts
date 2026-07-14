"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarTaxonomia } from "./taxonomia";
import { carregarAliasesDoPerfil } from "./fornecedores";
import { classificarLancamentos, VERSAO_CLASSIFICADOR, type LancamentoParaClassificar } from "./motor";

export interface ClassificarPendentesResultado {
  totalProcessados: number;
  porRegra: number;
  porLlm: number;
}

/** Gera propostas de classificação para todo lançamento do perfil que ainda não tem nenhuma. */
export async function classificarLancamentosPendentes(): Promise<ClassificarPendentesResultado> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return { totalProcessados: 0, porRegra: 0, porLlm: 0 };

  const { data: lancamentos, error: errLancamentos } = await supabase
    .from("lancamentos_brutos")
    .select("id, descricao_original, valor, data")
    .in("cartao_id", cartaoIds);
  if (errLancamentos) throw new Error("Falha ao buscar lançamentos: " + errLancamentos.message);
  if (!lancamentos || lancamentos.length === 0) return { totalProcessados: 0, porRegra: 0, porLlm: 0 };

  const { data: propostasExistentes } = await supabase
    .from("classificacao_propostas")
    .select("lancamento_id")
    .in(
      "lancamento_id",
      lancamentos.map((l) => l.id),
    );
  const idsComProposta = new Set((propostasExistentes ?? []).map((p) => p.lancamento_id as string));

  const pendentes: LancamentoParaClassificar[] = lancamentos
    .filter((l) => !idsComProposta.has(l.id as string))
    .map((l) => ({
      id: l.id as string,
      descricaoOriginal: l.descricao_original as string,
      valor: l.valor as number,
      data: l.data as string,
    }));

  if (pendentes.length === 0) return { totalProcessados: 0, porRegra: 0, porLlm: 0 };

  const [taxonomia, aliases] = await Promise.all([carregarTaxonomia(supabase), carregarAliasesDoPerfil(supabase, perfilId)]);

  const propostas = await classificarLancamentos(pendentes, aliases, taxonomia);

  const linhas = propostas.map((p) => ({
    lancamento_id: p.lancamentoId,
    fornecedor_sugerido_id: p.fornecedorSugeridoId,
    categoria_id: p.categoriaId,
    subcategoria_id: p.subcategoriaId,
    objetivo_id: p.objetivoId,
    contexto_sugerido: p.contextoSugerido,
    confianca_categoria: p.confiancaCategoria,
    confianca_subcategoria: p.confiancaSubcategoria,
    confianca_objetivo: p.confiancaObjetivo,
    confianca_geral: p.confiancaGeral,
    justificativa: p.justificativa,
    origem: p.origem,
    versao_classificador: VERSAO_CLASSIFICADOR,
  }));

  const { error: errInsert } = await supabase.from("classificacao_propostas").insert(linhas);
  if (errInsert) throw new Error("Falha ao gravar propostas de classificação: " + errInsert.message);

  revalidatePath("/caixa-de-entrada");

  return {
    totalProcessados: propostas.length,
    porRegra: propostas.filter((p) => p.origem === "regra").length,
    porLlm: propostas.filter((p) => p.origem === "llm").length,
  };
}
