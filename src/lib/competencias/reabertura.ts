import "server-only";
import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export type Supabase = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

export async function registrarAuditoriaCompetencia(
  supabase: Supabase,
  perfilId: string,
  competenciaId: string,
  tipoEvento: string,
  detalhe?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: "competencia",
    entidade_relacionada_id: competenciaId,
    tipo_evento: tipoEvento,
    ator: "usuário",
    detalhe: detalhe ?? null,
  });
}

/** Reabre a competência (estado -> 'reaberta') e registra o motivo em auditoria. Não valida estado atual — quem chama decide quando é apropriado. */
export async function reabrirCompetenciaInterno(
  supabase: Supabase,
  perfilId: string,
  competenciaId: string,
  motivo: string,
  detalheMotivo: string,
): Promise<void> {
  const { error } = await supabase.from("competencias").update({ estado: "reaberta" }).eq("id", competenciaId);
  if (error) throw new Error("Falha ao reabrir competência: " + error.message);

  await registrarAuditoriaCompetencia(supabase, perfilId, competenciaId, "reabertura", {
    motivo,
    detalheMotivo: detalheMotivo || undefined,
  });

  revalidatePath("/competencias");
  revalidatePath(`/competencias/${competenciaId}`);
}

/**
 * RUL-8: se o lançamento pertence a uma competência `fechada`, reabre
 * automaticamente (motivo "Correção") antes da correção/exceção/contexto
 * prosseguir — sem bloquear a ação do usuário.
 */
export async function reabrirSeFechada(supabase: Supabase, perfilId: string, lancamentoId: string): Promise<void> {
  const { data: lancamento } = await supabase
    .from("lancamentos_brutos")
    .select("competencia_calculada")
    .eq("id", lancamentoId)
    .single();
  if (!lancamento) return;

  const { data: competencia } = await supabase
    .from("competencias")
    .select("id, estado")
    .eq("perfil_id", perfilId)
    .eq("mes_referencia", lancamento.competencia_calculada as string)
    .maybeSingle();
  if (!competencia || competencia.estado !== "fechada") return;

  await reabrirCompetenciaInterno(supabase, perfilId, competencia.id as string, "Correção", "");
}
