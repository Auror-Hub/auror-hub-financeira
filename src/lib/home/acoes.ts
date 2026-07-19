"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export type DecisaoRecomendacao = "aceitou" | "agora não" | "não sugerir de novo";

/** Rearquitetura (Fase 1, ADR-007): decisão sobre a recomendação única destacada na Home. */
export async function decidirRecomendacao(recomendacaoId: string, decisao: DecisaoRecomendacao): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const { error } = await supabase.from("recomendacoes_decisoes").insert({ recomendacao_id: recomendacaoId, perfil_id: perfilId, decisao });
  if (error) throw new Error("Falha ao registrar decisão sobre a recomendação: " + error.message);
  revalidatePath("/");
}
