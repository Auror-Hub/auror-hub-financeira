import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface RegraResumo {
  id: string;
  fornecedorTexto: string;
  categoriaRotulo: string;
  objetivoRotulo: string | null;
  confianca: number;
  origem: "manual" | "aprendida";
  status: "ativa" | "inativa" | "conflitante" | "proposta";
  quantidadeExecucoes: number;
  ultimaUtilizacao: string | null;
  criadoEm: string;
}

/** Lista as regras do perfil com condição/consequência já resolvidas em texto legível — para SCR-RULES-001. */
export async function carregarRegras(): Promise<RegraResumo[]> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: regrasRaw, error: errRegras } = await supabase
    .from("regras")
    .select("id, confianca, origem, status, ultima_utilizacao, criado_em")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false });
  if (errRegras) throw new Error("Falha ao carregar regras: " + errRegras.message);
  const regras = regrasRaw ?? [];
  if (regras.length === 0) return [];

  const idsRegras = regras.map((r) => r.id as string);
  const [{ data: condicoesRaw, error: errCond }, { data: consequenciasRaw, error: errCons }, { data: execucoesRaw, error: errExec }] =
    await Promise.all([
      supabase.from("regra_condicoes").select("regra_id, valor_condicao").in("regra_id", idsRegras).eq("tipo", "fornecedor_contem"),
      supabase.from("regra_consequencias").select("regra_id, parametros").in("regra_id", idsRegras).eq("tipo", "sugerir_classificacao"),
      supabase.from("regra_execucoes").select("regra_id").in("regra_id", idsRegras),
    ]);
  if (errCond) throw new Error("Falha ao carregar condições: " + errCond.message);
  if (errCons) throw new Error("Falha ao carregar consequências: " + errCons.message);
  if (errExec) throw new Error("Falha ao carregar execuções: " + errExec.message);

  const condicaoPorRegra = new Map(
    (condicoesRaw ?? []).map((c) => [c.regra_id as string, (c.valor_condicao as { texto?: string })?.texto ?? ""]),
  );
  const consequenciaPorRegra = new Map(
    (consequenciasRaw ?? []).map((c) => [
      c.regra_id as string,
      c.parametros as { categoriaId?: string; subcategoriaId?: string; objetivoId?: string | null },
    ]),
  );
  const execucoesPorRegra = new Map<string, number>();
  for (const e of execucoesRaw ?? []) {
    const id = e.regra_id as string;
    execucoesPorRegra.set(id, (execucoesPorRegra.get(id) ?? 0) + 1);
  }

  const idsTermos = new Set<string>();
  for (const p of consequenciaPorRegra.values()) {
    if (p.categoriaId) idsTermos.add(p.categoriaId);
    if (p.objetivoId) idsTermos.add(p.objetivoId);
  }
  const { data: termosRaw, error: errTermos } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  if (errTermos) throw new Error("Falha ao carregar taxonomia: " + errTermos.message);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  return regras.map((r) => {
    const parametros = consequenciaPorRegra.get(r.id as string);
    return {
      id: r.id as string,
      fornecedorTexto: condicaoPorRegra.get(r.id as string) ?? "",
      categoriaRotulo: (parametros?.categoriaId && rotuloPorTermo.get(parametros.categoriaId)) ?? "—",
      objetivoRotulo: (parametros?.objetivoId && rotuloPorTermo.get(parametros.objetivoId)) ?? null,
      confianca: r.confianca as number,
      origem: r.origem as "manual" | "aprendida",
      status: r.status as "ativa" | "inativa" | "conflitante" | "proposta",
      quantidadeExecucoes: execucoesPorRegra.get(r.id as string) ?? 0,
      ultimaUtilizacao: (r.ultima_utilizacao as string | null) ?? null,
      criadoEm: r.criado_em as string,
    };
  });
}
