"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { reabrirCompetenciaInterno, registrarAuditoriaCompetencia } from "./reabertura";

/**
 * Fecha a competência: bloqueia se houver lançamento sem decisão registrada
 * (mesma definição de "pendente" da Caixa de Entrada); senão congela os
 * dados consolidados num snapshot imutável (D9) e grava uma nova versão de
 * fechamento (RUL-11 — a versão anterior, se houver, nunca é apagada).
 */
export async function fecharCompetencia(competenciaId: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: competencia, error: errComp } = await supabase
    .from("competencias")
    .select("id, mes_referencia, estado")
    .eq("id", competenciaId)
    .single();
  if (errComp || !competencia) throw new Error("Competência não encontrada.");

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, valor")
    .eq("competencia_calculada", competencia.mes_referencia as string);
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = lancamentosRaw ?? [];
  const idsLancamentos = lancamentos.map((l) => l.id as string);

  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, objetivo_id, versao")
    .in("lancamento_id", idsLancamentos.length > 0 ? idsLancamentos : ["00000000-0000-0000-0000-000000000000"])
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const decisaoVigentePorLancamento = new Map<string, { categoria_id: string | null; objetivo_id: string | null }>();
  for (const d of decisoesRaw ?? []) {
    decisaoVigentePorLancamento.set(d.lancamento_id as string, {
      categoria_id: d.categoria_id as string | null,
      objetivo_id: d.objetivo_id as string | null,
    });
  }

  const pendentes = idsLancamentos.filter((id) => !decisaoVigentePorLancamento.has(id));
  if (pendentes.length > 0) {
    throw new Error(
      `Fechamento bloqueado — ${pendentes.length} lançamento${pendentes.length === 1 ? "" : "s"} ainda aguarda${pendentes.length === 1 ? "" : "m"} revisão.`,
    );
  }

  const totalConsolidado = lancamentos.reduce((soma, l) => soma + (l.valor as number), 0);
  const quebraPorCategoria: Record<string, number> = {};
  const quebraPorObjetivo: Record<string, number> = {};
  for (const l of lancamentos) {
    const decisao = decisaoVigentePorLancamento.get(l.id as string);
    const valor = l.valor as number;
    if (decisao?.categoria_id) quebraPorCategoria[decisao.categoria_id] = (quebraPorCategoria[decisao.categoria_id] ?? 0) + valor;
    if (decisao?.objetivo_id) quebraPorObjetivo[decisao.objetivo_id] = (quebraPorObjetivo[decisao.objetivo_id] ?? 0) + valor;
  }

  const { data: ultimoFechamento } = await supabase
    .from("fechamentos_competencia")
    .select("id, versao, fechado_em")
    .eq("competencia_id", competenciaId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  let motivoReaberturaAnterior: string | null = null;
  if (ultimoFechamento) {
    const { data: reaberturaRaw } = await supabase
      .from("eventos_auditoria")
      .select("detalhe, criado_em")
      .eq("entidade_relacionada_tipo", "competencia")
      .eq("entidade_relacionada_id", competenciaId)
      .eq("tipo_evento", "reabertura")
      .gt("criado_em", ultimoFechamento.fechado_em as string)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const detalheReabertura = reaberturaRaw?.detalhe as { motivo?: string; detalheMotivo?: string } | null;
    if (detalheReabertura?.motivo) {
      motivoReaberturaAnterior = detalheReabertura.detalheMotivo
        ? `${detalheReabertura.motivo}: ${detalheReabertura.detalheMotivo}`
        : detalheReabertura.motivo;
    }
  }

  const novaVersao = (ultimoFechamento?.versao as number | undefined ?? 0) + 1;

  const { data: fechamento, error: errFechamento } = await supabase
    .from("fechamentos_competencia")
    .insert({ competencia_id: competenciaId, versao: novaVersao, motivo_reabertura_anterior: motivoReaberturaAnterior })
    .select()
    .single();
  if (errFechamento || !fechamento) throw new Error("Falha ao gravar fechamento: " + (errFechamento?.message ?? "erro desconhecido"));

  const dadosCongelados = {
    totalLancamentos: lancamentos.length,
    totalConsolidado,
    quebraPorCategoria,
    quebraPorObjetivo,
  };

  const { error: errSnapshot } = await supabase.from("snapshots_analiticos").insert({
    competencia_id: competenciaId,
    fechamento_id: fechamento.id,
    dados_congelados: dadosCongelados,
  });
  if (errSnapshot) throw new Error("Falha ao gravar snapshot: " + errSnapshot.message);

  const { error: errEstado } = await supabase.from("competencias").update({ estado: "fechada" }).eq("id", competenciaId);
  if (errEstado) throw new Error("Falha ao atualizar estado da competência: " + errEstado.message);

  await registrarAuditoriaCompetencia(supabase, perfilId, competenciaId, "fechamento", { versao: novaVersao });

  revalidatePath("/competencias");
  revalidatePath(`/competencias/${competenciaId}`);
}

/** Reabre uma competência fechada — motivo obrigatório (RUL-11: a versão anterior nunca é sobrescrita). */
export async function reabrirCompetencia(competenciaId: string, motivo: string, detalheMotivo: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  if (!motivo.trim()) throw new Error("Informe o motivo da reabertura.");

  const { data: competencia, error } = await supabase
    .from("competencias")
    .select("id, estado")
    .eq("id", competenciaId)
    .single();
  if (error || !competencia) throw new Error("Competência não encontrada.");
  if (competencia.estado !== "fechada") throw new Error("Só é possível reabrir uma competência fechada.");

  await reabrirCompetenciaInterno(supabase, perfilId, competenciaId, motivo, detalheMotivo);
}
