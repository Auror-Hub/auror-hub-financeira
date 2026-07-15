import "server-only";
import type { Supabase } from "@/lib/competencias/reabertura";

export interface RegraAtiva {
  id: string;
  textoCondicao: string; // já em uppercase, pronto pra comparar
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
  confianca: number;
}

export interface ExecucaoRegraParaGravar {
  regraId: string;
  lancamentoId: string;
  resultado: "aplicada" | "bloqueada_por_conflito";
}

/** Carrega as regras ativas do perfil, já resolvendo condição (fornecedor_contem) e consequência (sugerir_classificacao). */
export async function carregarRegrasAtivas(supabase: Supabase, perfilId: string): Promise<RegraAtiva[]> {
  const { data: regrasRaw, error: errRegras } = await supabase
    .from("regras")
    .select("id, confianca")
    .eq("perfil_id", perfilId)
    .eq("status", "ativa");
  if (errRegras) throw new Error("Falha ao carregar regras: " + errRegras.message);
  const regras = regrasRaw ?? [];
  if (regras.length === 0) return [];

  const idsRegras = regras.map((r) => r.id as string);
  const [{ data: condicoesRaw, error: errCond }, { data: consequenciasRaw, error: errCons }] = await Promise.all([
    supabase.from("regra_condicoes").select("regra_id, valor_condicao").in("regra_id", idsRegras).eq("tipo", "fornecedor_contem"),
    supabase.from("regra_consequencias").select("regra_id, parametros").in("regra_id", idsRegras).eq("tipo", "sugerir_classificacao"),
  ]);
  if (errCond) throw new Error("Falha ao carregar condições de regras: " + errCond.message);
  if (errCons) throw new Error("Falha ao carregar consequências de regras: " + errCons.message);

  const condicaoPorRegra = new Map(
    (condicoesRaw ?? []).map((c) => [c.regra_id as string, (c.valor_condicao as { texto: string }).texto]),
  );
  const consequenciaPorRegra = new Map(
    (consequenciasRaw ?? []).map((c) => [
      c.regra_id as string,
      c.parametros as { categoriaId?: string; subcategoriaId?: string; objetivoId?: string },
    ]),
  );

  return regras
    .map((r) => {
      const texto = condicaoPorRegra.get(r.id as string);
      const parametros = consequenciaPorRegra.get(r.id as string);
      if (!texto || !parametros) return null;
      return {
        id: r.id as string,
        textoCondicao: texto.toUpperCase(),
        categoriaId: parametros.categoriaId ?? null,
        subcategoriaId: parametros.subcategoriaId ?? null,
        objetivoId: parametros.objetivoId ?? null,
        confianca: r.confianca as number,
      };
    })
    .filter((r): r is RegraAtiva => r !== null);
}

/** Regras ativas cuja condição casa a descrição bruta do lançamento. */
export function regrasQueCasam(descricaoOriginal: string, regrasAtivas: RegraAtiva[]): RegraAtiva[] {
  const texto = descricaoOriginal.toUpperCase();
  return regrasAtivas.filter((r) => texto.includes(r.textoCondicao));
}

/** RUL-13: duas regras ativas com consequências diferentes pro mesmo lançamento é conflito, nunca resolvido em silêncio. */
export function consequenciasDivergem(regras: RegraAtiva[]): boolean {
  const chaves = new Set(regras.map((r) => `${r.categoriaId ?? ""}|${r.subcategoriaId ?? ""}|${r.objetivoId ?? ""}`));
  return chaves.size > 1;
}

/** Marca as regras informadas como conflitantes — chamado quando regrasQueCasam + consequenciasDivergem detectam conflito. */
export async function marcarRegrasConflitantes(supabase: Supabase, regraIds: string[]): Promise<void> {
  if (regraIds.length === 0) return;
  await supabase.from("regras").update({ status: "conflitante" }).in("id", regraIds).neq("status", "conflitante");
}

/**
 * Marca quando as regras foram usadas por último. `quantidade_acertos`/
 * `quantidade_correcoes` (dicionário ENT-RULE) ficam em 0 nesta fase — exigem
 * cruzar execução com decisão humana posterior (confirmou vs. corrigiu), o
 * que é um passo de agregação maior, fora do escopo deste primeiro corte.
 */
export async function registrarUsoRegras(supabase: Supabase, regraIds: string[]): Promise<void> {
  if (regraIds.length === 0) return;
  await supabase.from("regras").update({ ultima_utilizacao: new Date().toISOString() }).in("id", regraIds);
}
