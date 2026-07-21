import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { montarFaixaTexto } from "./benchmark-faixa";

const ROTULO_FONTE: Record<string, string> = {
  "IBGE-SIDRA-7060": "IPCA/IBGE",
};

export interface ComparacaoExterna {
  categoriaId: string;
  fonte: string;
  regiao: string;
  periodoReferencia: string;
  variacaoMensal: number | null;
  variacao12m: number | null;
  /** Texto pronto — sempre linguagem de faixa/referência, nunca "certo"/"errado"/"ideal". */
  faixaTexto: string;
}

/**
 * Fase 12 (Auditoria V2): só retorna algo se existir mapeamento explícito
 * pra essa categoria E a família tiver consentido com comparação externa E
 * houver dado disponível pro período exato — nunca interpola, nunca estima
 * quando falta. `perfilFamilia` é passado pelo chamador (evita repetir a
 * mesma leitura de `familias` a cada categoria dentro de um mesmo
 * relatório).
 */
export async function montarComparacaoExterna(
  categoriaId: string,
  mesReferencia: string,
  perfilFamilia: { consentimentoComparacaoExterna: boolean },
): Promise<ComparacaoExterna | null> {
  if (!perfilFamilia.consentimentoComparacaoExterna) return null;

  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: mapeamento } = await supabase
    .from("mapeamento_categoria_externa")
    .select("categoria_ibge")
    .eq("categoria_id", categoriaId)
    .maybeSingle();
  const categoriaIbge = (mapeamento?.categoria_ibge as string | null) ?? null;
  if (!categoriaIbge) return null;

  const { data: indice } = await supabase
    .from("indices_precos")
    .select("fonte, regiao, periodo_referencia, variacao_mensal, variacao_12m")
    .eq("categoria_ibge", categoriaIbge)
    .eq("periodo_referencia", mesReferencia)
    .maybeSingle();
  if (!indice) return null;

  const fonte = ROTULO_FONTE[indice.fonte as string] ?? (indice.fonte as string);
  const regiao = indice.regiao as string;
  const periodoReferencia = indice.periodo_referencia as string;
  const variacaoMensal = (indice.variacao_mensal as number | null) ?? null;
  const variacao12m = (indice.variacao_12m as number | null) ?? null;

  return {
    categoriaId,
    fonte,
    regiao,
    periodoReferencia,
    variacaoMensal,
    variacao12m,
    faixaTexto: montarFaixaTexto(variacao12m, regiao, periodoReferencia),
  };
}
