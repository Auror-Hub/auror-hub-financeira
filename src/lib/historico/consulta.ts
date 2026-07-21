import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";

const ITENS_POR_PAGINA = 50;

/** Mesmo vocabulário de status já gravado em `classificacao_decisoes.status` (ver decisoes.ts). */
export type StatusDecisaoHistorico = "confirmada" | "corrigida" | "exceção";

export interface FiltrosHistorico {
  categoriaId?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  /** "AAAA-MM" — mesmo valor de lancamentos_brutos.competencia_calculada. */
  competenciaMes?: string;
  /** Fase 7 (Auditoria V2): filtros adicionais — objetivo, cartão/conta, status da decisão, faixa de valor. */
  objetivoId?: string;
  cartaoId?: string;
  statusDecisao?: StatusDecisaoHistorico;
  /** Centavos, comparado contra o valor absoluto do lançamento (usuário pensa em "gastei entre X e Y", não no sinal). */
  valorMin?: number;
  valorMax?: number;
}

export interface ItemHistorico {
  lancamentoId: string;
  cartaoId: string;
  data: string;
  fornecedorOriginal: string;
  descricaoOriginal: string;
  valor: number;
  competenciaCalculada: string;
  categoriaId: string | null;
  categoriaRotulo: string | null;
  subcategoriaId: string | null;
  subcategoriaRotulo: string | null;
  objetivoId: string | null;
  objetivoRotulo: string | null;
  contexto: string | null;
  statusDecisao: string | null;
}

export interface HistoricoPaginado {
  itens: ItemHistorico[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Lista lançamentos já decididos (Ajuste D — Histórico é uma lista plana por lançamento, não SCR-HISTORY-001 original).
 * `itensPorPagina` é configurável pra permitir mostrar TUDO de uma competência de uma vez (revisão pré-fechamento,
 * ver CompetencyDetailScreen) sem afetar a paginação padrão de `/historico`.
 */
export async function carregarLancamentosDecididos(
  filtros: FiltrosHistorico,
  pagina = 1,
  itensPorPagina = ITENS_POR_PAGINA,
): Promise<HistoricoPaginado> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return { itens: [], total: 0, pagina: 1, totalPaginas: 0 };
  if (filtros.cartaoId && !cartaoIds.includes(filtros.cartaoId)) return { itens: [], total: 0, pagina: 1, totalPaginas: 0 };

  let query = supabase
    .from("lancamentos_brutos")
    .select("id, cartao_id, data, fornecedor_original, descricao_original, valor, competencia_calculada")
    .in("cartao_id", filtros.cartaoId ? [filtros.cartaoId] : cartaoIds)
    .order("data", { ascending: false });

  if (filtros.fornecedor) query = query.ilike("fornecedor_original", `%${filtros.fornecedor}%`);
  if (filtros.dataInicio) query = query.gte("data", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data", filtros.dataFim);
  if (filtros.competenciaMes) query = query.eq("competencia_calculada", filtros.competenciaMes);

  const { data: lancamentosRaw, error: errL } = await query;
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const inativos = await carregarIdsInativos(supabase, perfilId);
  const lancamentos = (lancamentosRaw ?? []).filter((l) => !inativos.has(l.id as string));
  if (lancamentos.length === 0) return { itens: [], total: 0, pagina: 1, totalPaginas: 0 };

  const idsLancamentos = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, subcategoria_id, objetivo_id, contexto, status, versao")
    .in("lancamento_id", idsLancamentos)
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const decisaoVigentePorLancamento = new Map<
    string,
    { categoria_id: string | null; subcategoria_id: string | null; objetivo_id: string | null; contexto: string | null; status: string | null }
  >();
  for (const d of decisoesRaw ?? []) {
    decisaoVigentePorLancamento.set(d.lancamento_id as string, {
      categoria_id: d.categoria_id as string | null,
      subcategoria_id: d.subcategoria_id as string | null,
      objetivo_id: d.objetivo_id as string | null,
      contexto: d.contexto as string | null,
      status: d.status as string | null,
    });
  }

  const idsTermos = new Set<string>();
  for (const d of decisaoVigentePorLancamento.values()) {
    if (d.categoria_id) idsTermos.add(d.categoria_id);
    if (d.subcategoria_id) idsTermos.add(d.subcategoria_id);
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
        cartaoId: l.cartao_id as string,
        data: l.data as string,
        fornecedorOriginal: l.fornecedor_original as string,
        descricaoOriginal: l.descricao_original as string,
        valor: l.valor as number,
        competenciaCalculada: l.competencia_calculada as string,
        categoriaId: decisao.categoria_id,
        categoriaRotulo: decisao.categoria_id ? rotuloPorTermo.get(decisao.categoria_id) ?? null : null,
        subcategoriaId: decisao.subcategoria_id,
        subcategoriaRotulo: decisao.subcategoria_id ? rotuloPorTermo.get(decisao.subcategoria_id) ?? null : null,
        objetivoId: decisao.objetivo_id,
        objetivoRotulo: decisao.objetivo_id ? rotuloPorTermo.get(decisao.objetivo_id) ?? null : null,
        contexto: decisao.contexto,
        statusDecisao: decisao.status,
      };
    })
    .filter((item) => !filtros.categoriaId || item.categoriaId === filtros.categoriaId)
    .filter((item) => !filtros.objetivoId || item.objetivoId === filtros.objetivoId)
    .filter((item) => !filtros.statusDecisao || item.statusDecisao === filtros.statusDecisao)
    .filter((item) => filtros.valorMin === undefined || Math.abs(item.valor) >= filtros.valorMin)
    .filter((item) => filtros.valorMax === undefined || Math.abs(item.valor) <= filtros.valorMax);

  const total = decididos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaValida - 1) * itensPorPagina;

  return {
    itens: decididos.slice(inicio, inicio + itensPorPagina),
    total,
    pagina: paginaValida,
    totalPaginas,
  };
}
