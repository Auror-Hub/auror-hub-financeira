"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { calcularCompetencia, calcularIdentificadorDeduplicacao } from "@/lib/import/parse";

/**
 * Lançamento manual — despesas que nunca passam pelo cartão (aluguel,
 * condomínio, contas, PIX). Diferente da importação: aqui o próprio
 * cadastro já é a decisão (categoria/objetivo informados por Victoria na
 * hora), não passa pela Caixa de Entrada. Ver BE-4 no plano de construção.
 */
export async function criarLancamentoManual(formData: FormData): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  const cartaoId = String(formData.get("cartaoId") ?? "");
  const data = String(formData.get("data") ?? "");
  const competenciaInformada = String(formData.get("competencia") ?? "");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const valorReais = Number(formData.get("valor") ?? "");
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const subcategoriaId = String(formData.get("subcategoriaId") ?? "") || undefined;
  const objetivoId = String(formData.get("objetivoId") ?? "");
  const contexto = String(formData.get("contexto") ?? "").trim() || undefined;

  if (!cartaoId || !data || !fornecedor || !categoriaId || !objetivoId) {
    throw new Error("Preencha fonte, data, fornecedor, categoria e objetivo.");
  }
  if (!Number.isFinite(valorReais) || valorReais <= 0) {
    throw new Error("Informe um valor válido, maior que zero.");
  }

  // Convenção interna: gasto = negativo (mesma do motor de importação).
  const valorCentavos = -Math.round(valorReais * 100);
  // Tópico A (brainstorm 3): competência é sempre decidida por quem lança —
  // default sugerido é o mês da data, mas nunca calculado à força (regime de
  // competência pode divergir do regime de caixa, ex.: aluguel pago em julho
  // referente a junho).
  const competencia = /^\d{4}-\d{2}$/.test(competenciaInformada) ? competenciaInformada : calcularCompetencia(data);
  const idDedup = calcularIdentificadorDeduplicacao({ data, valor: valorCentavos, fornecedorOriginal: fornecedor, cartaoId });

  const { data: lancamento, error: errLancamento } = await supabase
    .from("lancamentos_brutos")
    .insert({
      cartao_id: cartaoId,
      competencia_calculada: competencia,
      data,
      fornecedor_original: fornecedor,
      descricao_original: fornecedor,
      valor: valorCentavos,
      moeda: "BRL",
      origem: "manual",
      identificador_deduplicacao: idDedup,
    })
    .select()
    .single();
  if (errLancamento || !lancamento) throw new Error("Falha ao gravar lançamento: " + (errLancamento?.message ?? "erro desconhecido"));

  const { error: errDecisao } = await supabase.from("classificacao_decisoes").insert({
    lancamento_id: lancamento.id,
    proposta_anterior_id: null,
    categoria_id: categoriaId,
    subcategoria_id: subcategoriaId ?? null,
    objetivo_id: objetivoId,
    contexto: contexto ?? null,
    origem_da_decisao: "manual",
    status: "confirmada",
    versao: 1,
  });
  if (errDecisao) throw new Error("Falha ao gravar classificação: " + errDecisao.message);

  await supabase.from("eventos_revisao").insert({ lancamento_id: lancamento.id, tipo: "confirmou", usuario_id: user.id });
  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: "lancamento_bruto",
    entidade_relacionada_id: lancamento.id,
    tipo_evento: "criação",
    ator: "usuário",
    detalhe: { origem: "manual" },
  });

  revalidatePath("/enviar");
  revalidatePath("/caixa-de-entrada");
}
