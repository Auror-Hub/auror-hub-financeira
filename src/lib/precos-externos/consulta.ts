import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface CestaBasicaRegistro {
  id: string;
  capital: string;
  periodoReferencia: string;
  valorCesta: number;
  criadoEm: string;
}

/** Fase 12 (Auditoria V2): últimos registros de cesta básica (DIEESE, entrada manual) — usado em Configurações pra mostrar o que já foi cadastrado. Dado global (não por família), mesmo padrão de leitura de `taxonomia_termos`. */
export async function carregarCestaBasicaRecente(limite = 12): Promise<CestaBasicaRegistro[]> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data, error } = await supabase
    .from("cesta_basica_precos")
    .select("id, capital, periodo_referencia, valor_cesta, criado_em")
    .order("periodo_referencia", { ascending: false })
    .order("capital", { ascending: true })
    .limit(limite);
  if (error) throw new Error("Falha ao carregar cesta básica: " + error.message);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    capital: r.capital as string,
    periodoReferencia: r.periodo_referencia as string,
    valorCesta: r.valor_cesta as number,
    criadoEm: r.criado_em as string,
  }));
}
