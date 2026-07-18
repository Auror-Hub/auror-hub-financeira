import "server-only";
import type { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

type Supabase = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

/**
 * ADR-005: ids de lançamentos "inativos" (excluídos ou substituídos por uma
 * versão corrigida) — devem ser escondidos de todas as telas e agregações de
 * acervo. A linha original nunca é apagada (RUL-1); só marcada em
 * `lancamentos_correcoes`. O substituto (nova versão) aparece normalmente.
 */
export async function carregarIdsInativos(supabase: Supabase, perfilId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("lancamentos_correcoes")
    .select("lancamento_original_id")
    .eq("perfil_id", perfilId);
  return new Set((data ?? []).map((r) => r.lancamento_original_id as string));
}
