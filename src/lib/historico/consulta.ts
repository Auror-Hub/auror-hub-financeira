import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

const ITENS_POR_PAGINA = 50;

export interface FiltrosHistorico {
  categoriaId?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface ItemHistorico {
  lancamentoId: string;
  data: string;
  fornecedorOriginal: string;
  descricaoOriginal: string;
  valor: number;
  competenciaCalculada: string;
  categoriaId: string | null;
  categoriaRotulo: string | null;
  objetivoId: string | null;
  objetivoRotulo: string | null;
}

export interface HistoricoPaginado {
  itens: ItemHistorico[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/** Lista lançamentos já decididos (Ajuste D — Histórico é uma lista plana por lançamento, não SCR-HISTORY-001 original). */
export async function carregarLancamentosDecididos(filtros: FiltrosHistorico, pagina = 1): Promise<HistoricoPaginado> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return { itens: [], total: 0, pagina: 1, totalPaginas: 0 };

  let query = supabase
    .from("lancamentos_brutos")
    .select("id, data, fornecedor_original, descricao_original, valor, competencia_calculada")
    .in("cartao_id", cartaoIds)
    .order("data", { ascending: false });

  if (filtros.fornecedor) query = query.ilike("fornecedor_original", `%${filtros.fornecedor}%`);
  if (filtros.dataInicio) query = query.gte("data", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data", filtros.dataFim);

  const { data: lancamentosRaw, error: errL } = await query;
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = lancamentosRaw ?? [];
  if (lancamentos.length === 0) return { itens: [], total: 0, pagina: 1, totalPaginas: 0 };

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

  const idsTermos = new Set<string>();
  for (const d of decisaoVigentePorLancamento.values()) {
    if (d.categoria_id) idsTermos.add(d.categoria_id);
    if (d.objetivo_id) idsTermos.add(d.objetivo_id);
  }
  const { data: termosRaw, error: errTermos } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  if (errTermos) throw new Error("Falha ao carregar taxonomia: " + errTermos.message);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const decididos = lancamentos
    .filter((l) => decisaoVigentePorLancamento.has(l.id as string))
    .map((l) => {
      const decisao = decisaoVigentePorLancamento.get(l.id as string)!;
      return {
        lancamentoId: l.id as string,
        data: l.data as string,
        fornecedorOriginal: l.fornecedor_original as string,
        descricaoOriginal: l.descricao_original as string,
        valor: l.valor as number,
        competenciaCalculada: l.competencia_calculada as string,
        categoriaId: decisao.categoria_id,
        categoriaRotulo: decisao.categoria_id ? rotuloPorTermo.get(decisao.categoria_id) ?? null : null,
        objetivoId: decisao.objetivo_id,
        objetivoRotulo: decisao.objetivo_id ? rotuloPorTermo.get(decisao.objetivo_id) ?? null : null,
      };
    })
    .filter((item) => !filtros.categoriaId || item.categoriaId === filtros.categoriaId);

  const total = decididos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaValida - 1) * ITENS_POR_PAGINA;

  return {
    itens: decididos.slice(inicio, inicio + ITENS_POR_PAGINA),
    total,
    pagina: paginaValida,
    totalPaginas,
  };
}
