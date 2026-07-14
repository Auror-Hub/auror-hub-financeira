import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TermoTaxonomiaRow {
  id: string;
  dimensao: "categoria" | "subcategoria" | "objetivo";
  termoPaiId: string | null;
  rotulo: string;
}

/** Carrega todo o vocabulário ativo (categoria/subcategoria/objetivo) para uso pelo motor de classificação e pela UI. */
export async function carregarTaxonomia(supabase: SupabaseClient): Promise<TermoTaxonomiaRow[]> {
  const { data, error } = await supabase
    .from("taxonomia_termos")
    .select("id, dimensao, termo_pai_id, rotulo")
    .eq("status", "ativo");
  if (error) throw new Error("Falha ao carregar taxonomia: " + error.message);

  return (data ?? []).map((t) => ({
    id: t.id as string,
    dimensao: t.dimensao as TermoTaxonomiaRow["dimensao"],
    termoPaiId: t.termo_pai_id as string | null,
    rotulo: t.rotulo as string,
  }));
}

/** Índice rótulo→id por dimensão, útil pro motor casar nomes vindos da IA ou de regras com o termo real. */
export function indexarPorRotulo(termos: TermoTaxonomiaRow[]) {
  const indice = new Map<string, TermoTaxonomiaRow>();
  for (const termo of termos) {
    indice.set(`${termo.dimensao}:${termo.rotulo.trim().toLowerCase()}`, termo);
  }
  return {
    buscar(dimensao: TermoTaxonomiaRow["dimensao"], rotulo: string | undefined | null) {
      if (!rotulo) return undefined;
      return indice.get(`${dimensao}:${rotulo.trim().toLowerCase()}`);
    },
  };
}
