import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { NaturezaPlano } from "./validacao";

const ROTULO_RESERVA_NAO_DISTRIBUIDA = "Reserva não distribuída";

export interface LinhaPlano {
  id: string;
  categoriaId: string | null;
  categoriaRotulo: string;
  /** Fase 17 (Auditoria V3.1): alocação DENTRO de categoriaId — null quando a linha é no nível da categoria toda. */
  subcategoriaId: string | null;
  subcategoriaRotulo: string | null;
  valorPlanejado: number;
  natureza: NaturezaPlano;
}

export interface PlanoMensal {
  id: string | null;
  mesReferencia: string;
  /** Só a renda informada NESTE mês (planos_mensais.renda_informada) — null quando não informada. */
  rendaInformada: number | null;
  /** Renda efetiva usada nos cálculos: rendaInformada, ou a renda líquida do Perfil Financeiro como fallback (Fase 17). */
  rendaEfetiva: number | null;
  /** De onde veio rendaEfetiva — null quando nenhuma das duas fontes tem valor. */
  rendaOrigem: "informada" | "perfil" | null;
  linhas: LinhaPlano[];
  /** Soma das linhas — 0 quando não há plano ainda ou o plano está vazio. */
  total: number;
  /** rendaEfetiva − total. null quando não há renda (nem informada nem no perfil). */
  naoAlocado: number | null;
}

async function carregarRendaLiquidaPerfil(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  perfilId: string,
): Promise<number | null> {
  const { data } = await supabase.from("familias").select("renda_liquida_mensal").eq("id", perfilId).maybeSingle();
  return (data?.renda_liquida_mensal as number | null | undefined) ?? null;
}

/**
 * Fase 8 (Auditoria V2): fonte real de "Planejado" — soma de `plano_linhas`,
 * aditiva por construção (unique(plano_mensal_id, categoria_id, subcategoria_id)
 * no banco + validarLinhasPlano no código). Nunca deriva de `metas`, que podem
 * se sobrepor por design (ver ADR-007/Fase 5).
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

  const rendaInformada = (plano?.renda_informada as number | null | undefined) ?? null;
  let rendaEfetiva = rendaInformada;
  let rendaOrigem: PlanoMensal["rendaOrigem"] = rendaInformada !== null ? "informada" : null;
  if (rendaEfetiva === null) {
    rendaEfetiva = await carregarRendaLiquidaPerfil(supabase, perfilId);
    if (rendaEfetiva !== null) rendaOrigem = "perfil";
  }

  if (!plano) {
    return { id: null, mesReferencia, rendaInformada, rendaEfetiva, rendaOrigem, linhas: [], total: 0, naoAlocado: rendaEfetiva };
  }

  const { data: linhasRaw, error: errLinhas } = await supabase
    .from("plano_linhas")
    .select("id, categoria_id, subcategoria_id, valor_planejado, natureza")
    .eq("plano_mensal_id", plano.id);
  if (errLinhas) throw new Error("Falha ao carregar linhas do plano: " + errLinhas.message);

  const idsTermos = new Set<string>();
  for (const l of linhasRaw ?? []) {
    if (l.categoria_id) idsTermos.add(l.categoria_id as string);
    if (l.subcategoria_id) idsTermos.add(l.subcategoria_id as string);
  }
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorId = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const linhas: LinhaPlano[] = (linhasRaw ?? [])
    .map((l) => ({
      id: l.id as string,
      categoriaId: l.categoria_id as string | null,
      categoriaRotulo: l.categoria_id ? rotuloPorId.get(l.categoria_id as string) ?? "—" : ROTULO_RESERVA_NAO_DISTRIBUIDA,
      subcategoriaId: l.subcategoria_id as string | null,
      subcategoriaRotulo: l.subcategoria_id ? rotuloPorId.get(l.subcategoria_id as string) ?? "—" : null,
      valorPlanejado: l.valor_planejado as number,
      natureza: l.natureza as NaturezaPlano,
    }))
    .sort((a, b) => b.valorPlanejado - a.valorPlanejado);

  const total = linhas.reduce((soma, l) => soma + l.valorPlanejado, 0);

  return {
    id: plano.id as string,
    mesReferencia,
    rendaInformada,
    rendaEfetiva,
    rendaOrigem,
    linhas,
    total,
    naoAlocado: rendaEfetiva !== null ? rendaEfetiva - total : null,
  };
}
