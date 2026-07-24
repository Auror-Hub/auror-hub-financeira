import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface CestaBasicaFamilia {
  cidadePerfil: string;
  capitalReferencia: string;
  regraCorrespondencia: "direta" | "proxy_uf";
  valorCesta: number | null;
  periodoReferencia: string | null;
  atualizadoEm: string | null;
}

/**
 * Fase 20 (Auditoria V3.1): substitui a leitura global de todos os
 * registros — a Hub agora resolve direto qual capital referencia a família
 * (via `perfis_localizacao_referencia`, derivado de cidade/estado do perfil
 * financeiro) e busca só o valor mais recente daquela capital. `null` =
 * perfil ainda sem cidade/estado informados, não um erro.
 */
export async function carregarCestaBasicaDaFamilia(): Promise<CestaBasicaFamilia | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: localizacao, error: errLocalizacao } = await supabase
    .from("perfis_localizacao_referencia")
    .select("cidade_perfil, capital_referencia, regra_correspondencia")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (errLocalizacao) throw new Error("Falha ao carregar localização de referência: " + errLocalizacao.message);
  if (!localizacao) return null;

  const { data: cesta, error: errCesta } = await supabase
    .from("cesta_basica_precos")
    .select("periodo_referencia, valor_cesta, criado_em")
    .eq("capital", localizacao.capital_referencia as string)
    .order("periodo_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errCesta) throw new Error("Falha ao carregar cesta básica: " + errCesta.message);

  return {
    cidadePerfil: localizacao.cidade_perfil as string,
    capitalReferencia: localizacao.capital_referencia as string,
    regraCorrespondencia: localizacao.regra_correspondencia as "direta" | "proxy_uf",
    valorCesta: (cesta?.valor_cesta as number | null) ?? null,
    periodoReferencia: (cesta?.periodo_referencia as string | null) ?? null,
    atualizadoEm: (cesta?.criado_em as string | null) ?? null,
  };
}
