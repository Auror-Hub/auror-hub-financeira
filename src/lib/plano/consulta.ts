import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { NaturezaPlano } from "./validacao";

export interface LinhaPlano {
  id: string;
  categoriaId: string | null;
  categoriaRotulo: string;
  valorPlanejado: number;
  natureza: NaturezaPlano;
}

export interface PlanoMensal {
  id: string | null;
  mesReferencia: string;
  rendaInformada: number | null;
  linhas: LinhaPlano[];
  /** Soma das linhas — 0 quando não há plano ainda ou o plano está vazio. */
  total: number;
  /** renda_informada − total. null quando não há renda informada. */
  naoAlocado: number | null;
}

/**
 * Fase 8 (Auditoria V2): fonte real de "Planejado" — soma de `plano_linhas`,
 * aditiva por construção (unique(plano_mensal_id, categoria_id) no banco +
 * validarLinhasPlano no código). Nunca deriva de `metas`, que podem se
 * sobrepor por design (ver ADR-007/Fase 5).
 */
export async function carregarPlanoMensal(mesReferencia: string): Promise<PlanoMensal> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: plano, error: errPlano } = await supabase
    .from("planos_mensais")
    .select("id, renda_informada")
    .eq("perfil_id", perfilId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();
  if (errPlano) throw new Error("Falha ao carregar plano mensal: " + errPlano.message);

  const vazio: PlanoMensal = { id: null, mesReferencia, rendaInformada: null, linhas: [], total: 0, naoAlocado: null };
  if (!plano) return vazio;

  const { data: linhasRaw, error: errLinhas } = await supabase
    .from("plano_linhas")
    .select("id, categoria_id, valor_planejado, natureza")
    .eq("plano_mensal_id", plano.id);
  if (errLinhas) throw new Error("Falha ao carregar linhas do plano: " + errLinhas.message);

  const idsCategorias = (linhasRaw ?? []).map((l) => l.categoria_id as string | null).filter((id): id is string => Boolean(id));
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsCategorias.length > 0 ? idsCategorias : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorId = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const linhas: LinhaPlano[] = (linhasRaw ?? [])
    .map((l) => ({
      id: l.id as string,
      categoriaId: l.categoria_id as string | null,
      categoriaRotulo: l.categoria_id ? rotuloPorId.get(l.categoria_id as string) ?? "—" : "Outras / geral",
      valorPlanejado: l.valor_planejado as number,
      natureza: l.natureza as NaturezaPlano,
    }))
    .sort((a, b) => b.valorPlanejado - a.valorPlanejado);

  const total = linhas.reduce((soma, l) => soma + l.valorPlanejado, 0);
  const rendaInformada = plano.renda_informada as number | null;

  return {
    id: plano.id as string,
    mesReferencia,
    rendaInformada,
    linhas,
    total,
    naoAlocado: rendaInformada !== null ? rendaInformada - total : null,
  };
}
