import "server-only";
import type { Supabase } from "@/lib/competencias/reabertura";

const LIMIAR_REPETICOES = 3;

/**
 * Agente de Aprendizagem (Fase 4) — observa uma correção manual e avalia se
 * o padrão (mesmo fornecedor sempre corrigido pra mesma categoria/objetivo)
 * já se repetiu o suficiente pra merecer uma regra. Nunca cria regra ativa
 * sozinho (RUL-6) — a proposta sempre nasce com status='proposta', exigindo
 * aprovação humana. Chamada dentro de corrigirClassificacao, best-effort.
 */
export async function avaliarAprendizagem(
  supabase: Supabase,
  perfilId: string,
  lancamentoId: string,
  decisaoId: string,
  categoriaId: string,
  objetivoId: string,
): Promise<void> {
  const { data: lancamentoAtual } = await supabase
    .from("lancamentos_brutos")
    .select("fornecedor_original")
    .eq("id", lancamentoId)
    .single();
  if (!lancamentoAtual) return;
  const fornecedorNormalizado = (lancamentoAtual.fornecedor_original as string).trim().toUpperCase();
  if (!fornecedorNormalizado) return;

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

  const { data: decisoesCorrigidas } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id")
    .in("lancamento_id", idsDoFornecedor)
    .eq("status", "corrigida")
    .eq("categoria_id", categoriaId)
    .eq("objetivo_id", objetivoId);
  const quantidadeConsistente = new Set((decisoesCorrigidas ?? []).map((d) => d.lancamento_id as string)).size;

  if (quantidadeConsistente < LIMIAR_REPETICOES) {
    await supabase.from("eventos_aprendizagem").insert({ gatilho_decisao_id: decisaoId, classificacao_evento: "correção pontual" });
    return;
  }

  const { data: regrasCandidatas } = await supabase.from("regras").select("id").eq("perfil_id", perfilId).in("status", ["ativa", "proposta"]);
  const idsRegrasCandidatas = (regrasCandidatas ?? []).map((r) => r.id as string);

  let regraExistenteId: string | null = null;
  if (idsRegrasCandidatas.length > 0) {
    const { data: condicoes } = await supabase
      .from("regra_condicoes")
      .select("regra_id, valor_condicao")
      .in("regra_id", idsRegrasCandidatas)
      .eq("tipo", "fornecedor_contem");
    const match = (condicoes ?? []).find(
      (c) => ((c.valor_condicao as { texto?: string })?.texto ?? "").trim().toUpperCase() === fornecedorNormalizado,
    );
    regraExistenteId = (match?.regra_id as string | undefined) ?? null;
  }

  if (regraExistenteId) {
    await supabase
      .from("eventos_aprendizagem")
      .insert({ gatilho_decisao_id: decisaoId, classificacao_evento: "regra global", regra_resultante_id: regraExistenteId });
    return;
  }

  const { data: novaRegra, error: errRegra } = await supabase
    .from("regras")
    .insert({ perfil_id: perfilId, confianca: 0.75, origem: "aprendida", status: "proposta" })
    .select()
    .single();
  if (errRegra || !novaRegra) throw new Error("Falha ao propor regra: " + (errRegra?.message ?? "erro desconhecido"));

  const { error: errCondicao } = await supabase
    .from("regra_condicoes")
    .insert({ regra_id: novaRegra.id, tipo: "fornecedor_contem", valor_condicao: { texto: fornecedorNormalizado } });
  if (errCondicao) throw new Error("Falha ao gravar condição da regra proposta: " + errCondicao.message);

  const { error: errConsequencia } = await supabase
    .from("regra_consequencias")
    .insert({ regra_id: novaRegra.id, tipo: "sugerir_classificacao", parametros: { categoriaId, objetivoId } });
  if (errConsequencia) throw new Error("Falha ao gravar consequência da regra proposta: " + errConsequencia.message);

  await supabase
    .from("eventos_aprendizagem")
    .insert({ gatilho_decisao_id: decisaoId, classificacao_evento: "novo padrão", regra_resultante_id: novaRegra.id });
}
