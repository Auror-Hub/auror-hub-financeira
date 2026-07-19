import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import { carregarLancamentosComCategoria } from "@/lib/lancamentos/porCategoria";
import { avaliarProgresso, type StatusProgressoMeta } from "./avaliacao";

const ROTULO_META_GERAL = "Orçamento geral";

export interface MetaComProgresso {
  id: string;
  categoriaId: string | null;
  categoriaRotulo: string;
  valorLimite: number;
  gastoAtual: number;
  percentual: number;
  statusProgresso: StatusProgressoMeta;
  status: "ativa" | "inativa";
  criadoEm: string;
}

/**
 * Carrega todas as metas (ativas e inativas, mais recentes primeiro) com o
 * progresso calculado contra a competência "atual" — mesma definição usada
 * pela Home (`carregarCompetencias()[0]`, esteja fechada ou não).
 */
export async function carregarMetas(): Promise<MetaComProgresso[]> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: metasRaw, error: errM } = await supabase
    .from("metas")
    .select("id, categoria_id, valor_limite, status, criado_em")
    .order("criado_em", { ascending: false });
  if (errM) throw new Error("Falha ao carregar metas: " + errM.message);
  const metas = metasRaw ?? [];
  if (metas.length === 0) return [];

  const idsCategorias = new Set<string>();
  for (const m of metas) if (m.categoria_id) idsCategorias.add(m.categoria_id as string);
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsCategorias.size > 0 ? [...idsCategorias] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorCategoria = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const competencias = await carregarCompetencias();
  const mesAtual = competencias[0]?.competencia.mesReferencia;

  const somaAtualPorCategoria = new Map<string, number>();
  let totalAtual = 0;
  if (mesAtual) {
    const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
    const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
    const inativos = await carregarIdsInativos(supabase, perfilId);
    const lancamentos = await carregarLancamentosComCategoria(supabase, cartaoIds, [mesAtual], inativos);
    for (const l of lancamentos) {
      totalAtual += l.valorAbs;
      if (l.categoriaId) somaAtualPorCategoria.set(l.categoriaId, (somaAtualPorCategoria.get(l.categoriaId) ?? 0) + l.valorAbs);
    }
  }

  return metas.map((m) => {
    const categoriaId = (m.categoria_id as string | null) ?? null;
    const gastoAtual = categoriaId ? somaAtualPorCategoria.get(categoriaId) ?? 0 : totalAtual;
    const valorLimite = m.valor_limite as number;
    const { percentual, status: statusProgresso } = avaliarProgresso(valorLimite, gastoAtual);
    return {
      id: m.id as string,
      categoriaId,
      categoriaRotulo: categoriaId ? rotuloPorCategoria.get(categoriaId) ?? "—" : ROTULO_META_GERAL,
      valorLimite,
      gastoAtual,
      percentual,
      statusProgresso,
      status: m.status as "ativa" | "inativa",
      criadoEm: m.criado_em as string,
    };
  });
}
