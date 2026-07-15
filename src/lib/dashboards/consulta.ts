import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface FiltrosDashboard {
  dataInicio: string;
  dataFim: string;
  categoriaId?: string;
  objetivoId?: string;
}

export interface PontoCategoria {
  categoriaId: string;
  categoriaRotulo: string;
  total: number;
}

export interface PontoObjetivo {
  objetivoId: string;
  objetivoRotulo: string;
  total: number;
}

export interface PontoMensal {
  mes: string;
  total: number;
}

export interface DadosDashboard {
  totalPeriodo: number;
  totalLancamentos: number;
  porCategoria: PontoCategoria[];
  porObjetivo: PontoObjetivo[];
  porMes: PontoMensal[];
}

/**
 * Fase Dashboards (brainstorm 2026-07-15) — agregações a partir de dado
 * VIVO (lancamentos_brutos + decisão vigente), não do snapshot congelado
 * dos Relatórios. É o modo exploratório do momento, não histórico fechado.
 */
export async function carregarDadosDashboard(filtros: FiltrosDashboard): Promise<DadosDashboard> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  const vazio: DadosDashboard = { totalPeriodo: 0, totalLancamentos: 0, porCategoria: [], porObjetivo: [], porMes: [] };
  if (cartaoIds.length === 0) return vazio;

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, valor, competencia_calculada")
    .in("cartao_id", cartaoIds)
    .gte("data", filtros.dataInicio)
    .lte("data", filtros.dataFim);
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = lancamentosRaw ?? [];
  if (lancamentos.length === 0) return vazio;

  const idsLancamentos = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, objetivo_id, versao")
    .in("lancamento_id", idsLancamentos)
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const decisaoVigentePorLancamento = new Map<string, { categoria_id: string | null; objetivo_id: string | null }>();
  for (const d of decisoesRaw ?? []) {
    decisaoVigentePorLancamento.set(d.lancamento_id as string, {
      categoria_id: d.categoria_id as string | null,
      objetivo_id: d.objetivo_id as string | null,
    });
  }

  const decididos = lancamentos
    .map((l) => ({
      valor: Math.abs(l.valor as number),
      competencia: l.competencia_calculada as string,
      decisao: decisaoVigentePorLancamento.get(l.id as string),
    }))
    .filter((l) => l.decisao)
    .filter((l) => !filtros.categoriaId || l.decisao?.categoria_id === filtros.categoriaId)
    .filter((l) => !filtros.objetivoId || l.decisao?.objetivo_id === filtros.objetivoId);

  if (decididos.length === 0) return vazio;

  const totalPeriodo = decididos.reduce((soma, l) => soma + l.valor, 0);

  const somaPorCategoria = new Map<string, number>();
  const somaPorObjetivo = new Map<string, number>();
  const somaPorMes = new Map<string, number>();
  for (const l of decididos) {
    if (l.decisao?.categoria_id) somaPorCategoria.set(l.decisao.categoria_id, (somaPorCategoria.get(l.decisao.categoria_id) ?? 0) + l.valor);
    if (l.decisao?.objetivo_id) somaPorObjetivo.set(l.decisao.objetivo_id, (somaPorObjetivo.get(l.decisao.objetivo_id) ?? 0) + l.valor);
    somaPorMes.set(l.competencia, (somaPorMes.get(l.competencia) ?? 0) + l.valor);
  }

  const idsTermos = new Set<string>([...somaPorCategoria.keys(), ...somaPorObjetivo.keys()]);
  const { data: termosRaw, error: errTermos } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  if (errTermos) throw new Error("Falha ao carregar taxonomia: " + errTermos.message);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const porCategoria = [...somaPorCategoria.entries()]
    .map(([categoriaId, total]) => ({ categoriaId, categoriaRotulo: rotuloPorTermo.get(categoriaId) ?? "—", total }))
    .sort((a, b) => b.total - a.total);
  const porObjetivo = [...somaPorObjetivo.entries()]
    .map(([objetivoId, total]) => ({ objetivoId, objetivoRotulo: rotuloPorTermo.get(objetivoId) ?? "—", total }))
    .sort((a, b) => b.total - a.total);
  const porMes = [...somaPorMes.entries()].map(([mes, total]) => ({ mes, total })).sort((a, b) => a.mes.localeCompare(b.mes));

  return { totalPeriodo, totalLancamentos: decididos.length, porCategoria, porObjetivo, porMes };
}
