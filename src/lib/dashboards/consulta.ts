import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { formatData } from "@/lib/format";

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

/* ────────────────────────────────────────────────────────────────────────────
 * Painel de Controle (Relato de Uso 1, 2026-07-16) — redesenho do dashboard como
 * jornada macro → micro. Reaproveita o mesmo dado vivo (lancamentos_brutos +
 * decisão vigente), mas monta a hierarquia categoria → subcategoria → fornecedor,
 * compara com o período anterior de mesma duração e destaca o que fugiu do padrão.
 * Zero IA no caminho — tudo determinístico (mesma disciplina de custo/latência).
 * ──────────────────────────────────────────────────────────────────────────── */

// Mesmos limiares da Home (src/lib/home/consulta.ts), pra consistência entre telas.
const MULTIPLICADOR_DESPESA_EXTRAORDINARIA = 2;
const LIMIAR_VARIACAO_CATEGORIA = 0.1;
const PISO_DESPESA_EXTRAORDINARIA = 5000; // R$ 50,00 em centavos — ignora ruído de valores baixos
const MAX_EXTRAORDINARIAS = 5;
const MAX_FORNECEDORES_POR_CATEGORIA = 5;
const SEM_SUBCATEGORIA = "(sem subcategoria)";

export interface FiltrosPainel {
  dataInicio: string;
  dataFim: string;
  objetivoId?: string;
}

export interface SubcategoriaBreakdown {
  rotulo: string;
  total: number;
  percentualDaCategoria: number;
}
export interface FornecedorBreakdown {
  fornecedor: string;
  total: number;
}
export interface CategoriaBreakdown {
  categoriaId: string;
  rotulo: string;
  total: number;
  percentualDoTotal: number;
  variacaoVsAnterior: number | null;
  subcategorias: SubcategoriaBreakdown[];
  topFornecedores: FornecedorBreakdown[];
}
export interface CategoriaPressionada {
  rotulo: string;
  variacao: number;
  aumento: number;
}
export interface DespesaExtraordinariaDash {
  fornecedor: string;
  categoriaRotulo: string;
  valor: number;
  vezesMedia: number;
}
export interface PainelControle {
  periodo: { inicio: string; fim: string; rotulo: string };
  total: number;
  totalLancamentos: number;
  ticketMedio: number;
  comparacao: { totalAnterior: number; variacao: number; rotuloAnterior: string } | null;
  categorias: CategoriaBreakdown[];
  pressionadas: CategoriaPressionada[];
  extraordinarias: DespesaExtraordinariaDash[];
  porObjetivo: PontoObjetivo[];
  porMes: PontoMensal[];
}

interface ItemDecidido {
  valor: number; // abs, centavos
  competencia: string;
  fornecedor: string;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
}

interface AgregadoPeriodo {
  total: number;
  itens: ItemDecidido[];
  porCategoria: Map<string, number>;
}

const PAINEL_VAZIO: Omit<PainelControle, "periodo"> = {
  total: 0,
  totalLancamentos: 0,
  ticketMedio: 0,
  comparacao: null,
  categorias: [],
  pressionadas: [],
  extraordinarias: [],
  porObjetivo: [],
  porMes: [],
};

type SupabaseServer = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

/** Agrega os lançamentos decididos de um intervalo (fato vivo + decisão vigente), opcionalmente filtrado por objetivo. */
async function agregarPeriodo(
  supabase: SupabaseServer,
  cartaoIds: string[],
  dataInicio: string,
  dataFim: string,
  objetivoId: string | undefined,
): Promise<AgregadoPeriodo> {
  const vazio: AgregadoPeriodo = { total: 0, itens: [], porCategoria: new Map() };

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, valor, competencia_calculada, fornecedor_original")
    .in("cartao_id", cartaoIds)
    .gte("data", dataInicio)
    .lte("data", dataFim);
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = lancamentosRaw ?? [];
  if (lancamentos.length === 0) return vazio;

  const ids = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, subcategoria_id, objetivo_id, versao")
    .in("lancamento_id", ids)
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const decisaoPorLancamento = new Map<string, { categoria_id: string | null; subcategoria_id: string | null; objetivo_id: string | null }>();
  for (const d of decisoesRaw ?? []) {
    decisaoPorLancamento.set(d.lancamento_id as string, {
      categoria_id: d.categoria_id as string | null,
      subcategoria_id: d.subcategoria_id as string | null,
      objetivo_id: d.objetivo_id as string | null,
    });
  }

  const itens: ItemDecidido[] = [];
  const porCategoria = new Map<string, number>();
  let total = 0;
  for (const l of lancamentos) {
    const decisao = decisaoPorLancamento.get(l.id as string);
    if (!decisao) continue; // só decididos
    if (objetivoId && decisao.objetivo_id !== objetivoId) continue;
    const valor = Math.abs(l.valor as number);
    itens.push({
      valor,
      competencia: l.competencia_calculada as string,
      fornecedor: (l.fornecedor_original as string) || "—",
      categoriaId: decisao.categoria_id,
      subcategoriaId: decisao.subcategoria_id,
      objetivoId: decisao.objetivo_id,
    });
    total += valor;
    if (decisao.categoria_id) porCategoria.set(decisao.categoria_id, (porCategoria.get(decisao.categoria_id) ?? 0) + valor);
  }

  return { total, itens, porCategoria };
}

function isoDeData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function carregarPainelControle(filtros: FiltrosPainel): Promise<PainelControle> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const rotuloPeriodo = `${formatData(filtros.dataInicio)} – ${formatData(filtros.dataFim)}`;
  const periodo = { inicio: filtros.dataInicio, fim: filtros.dataFim, rotulo: rotuloPeriodo };

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return { periodo, ...PAINEL_VAZIO };

  // Período anterior de mesma duração, imediatamente antes.
  const msDia = 86400000;
  const inicioDate = new Date(filtros.dataInicio + "T00:00:00Z");
  const fimDate = new Date(filtros.dataFim + "T00:00:00Z");
  const duracaoDias = Math.max(1, Math.round((fimDate.getTime() - inicioDate.getTime()) / msDia) + 1);
  const anteriorFimDate = new Date(inicioDate.getTime() - msDia);
  const anteriorInicioDate = new Date(anteriorFimDate.getTime() - (duracaoDias - 1) * msDia);
  const anteriorInicio = isoDeData(anteriorInicioDate);
  const anteriorFim = isoDeData(anteriorFimDate);

  const [atual, anterior] = await Promise.all([
    agregarPeriodo(supabase, cartaoIds, filtros.dataInicio, filtros.dataFim, filtros.objetivoId),
    agregarPeriodo(supabase, cartaoIds, anteriorInicio, anteriorFim, filtros.objetivoId),
  ]);

  if (atual.itens.length === 0) {
    return {
      periodo,
      ...PAINEL_VAZIO,
      comparacao:
        anterior.total > 0
          ? { totalAnterior: anterior.total, variacao: -1, rotuloAnterior: `${formatData(anteriorInicio)} – ${formatData(anteriorFim)}` }
          : null,
    };
  }

  // Resolver rótulos de todos os termos envolvidos (categoria/subcategoria/objetivo).
  const idsTermos = new Set<string>();
  for (const i of atual.itens) {
    if (i.categoriaId) idsTermos.add(i.categoriaId);
    if (i.subcategoriaId) idsTermos.add(i.subcategoriaId);
    if (i.objetivoId) idsTermos.add(i.objetivoId);
  }
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const total = atual.total;
  const totalLancamentos = atual.itens.length;
  const ticketMedio = totalLancamentos > 0 ? Math.round(total / totalLancamentos) : 0;

  // Hierarquia categoria → subcategoria → fornecedores.
  interface AcumCategoria {
    total: number;
    subcategorias: Map<string, number>;
    fornecedores: Map<string, number>;
    valores: number[];
  }
  const porCategoria = new Map<string, AcumCategoria>();
  for (const i of atual.itens) {
    if (!i.categoriaId) continue;
    let acum = porCategoria.get(i.categoriaId);
    if (!acum) {
      acum = { total: 0, subcategorias: new Map(), fornecedores: new Map(), valores: [] };
      porCategoria.set(i.categoriaId, acum);
    }
    acum.total += i.valor;
    acum.valores.push(i.valor);
    const subRotulo = i.subcategoriaId ? rotuloPorTermo.get(i.subcategoriaId) ?? SEM_SUBCATEGORIA : SEM_SUBCATEGORIA;
    acum.subcategorias.set(subRotulo, (acum.subcategorias.get(subRotulo) ?? 0) + i.valor);
    acum.fornecedores.set(i.fornecedor, (acum.fornecedores.get(i.fornecedor) ?? 0) + i.valor);
  }

  const categorias: CategoriaBreakdown[] = [...porCategoria.entries()]
    .map(([categoriaId, acum]) => {
      const anteriorCat = anterior.porCategoria.get(categoriaId) ?? 0;
      const variacaoVsAnterior = anteriorCat > 0 ? (acum.total - anteriorCat) / anteriorCat : null;
      return {
        categoriaId,
        rotulo: rotuloPorTermo.get(categoriaId) ?? "—",
        total: acum.total,
        percentualDoTotal: total > 0 ? acum.total / total : 0,
        variacaoVsAnterior,
        subcategorias: [...acum.subcategorias.entries()]
          .map(([rotulo, subtotal]) => ({
            rotulo,
            total: subtotal,
            percentualDaCategoria: acum.total > 0 ? subtotal / acum.total : 0,
          }))
          .sort((a, b) => b.total - a.total),
        topFornecedores: [...acum.fornecedores.entries()]
          .map(([fornecedor, subtotal]) => ({ fornecedor, total: subtotal }))
          .sort((a, b) => b.total - a.total)
          .slice(0, MAX_FORNECEDORES_POR_CATEGORIA),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Categorias pressionadas: subiram acima do limiar vs. período anterior.
  const pressionadas: CategoriaPressionada[] = categorias
    .filter((c) => c.variacaoVsAnterior !== null && c.variacaoVsAnterior > LIMIAR_VARIACAO_CATEGORIA)
    .map((c) => ({
      rotulo: c.rotulo,
      variacao: c.variacaoVsAnterior as number,
      aumento: c.total - (anterior.porCategoria.get(c.categoriaId) ?? 0),
    }))
    .sort((a, b) => b.variacao - a.variacao);

  // Despesas extraordinárias: lançamentos individuais ≥ N× a média da própria categoria no período.
  const mediaPorCategoria = new Map<string, number>();
  for (const [categoriaId, acum] of porCategoria.entries()) {
    if (acum.valores.length > 0) mediaPorCategoria.set(categoriaId, acum.total / acum.valores.length);
  }
  const extraordinarias: DespesaExtraordinariaDash[] = atual.itens
    .filter((i) => i.categoriaId && i.valor >= PISO_DESPESA_EXTRAORDINARIA)
    .map((i) => {
      const media = mediaPorCategoria.get(i.categoriaId as string) ?? 0;
      return {
        fornecedor: i.fornecedor,
        categoriaRotulo: rotuloPorTermo.get(i.categoriaId as string) ?? "—",
        valor: i.valor,
        vezesMedia: media > 0 ? i.valor / media : 0,
      };
    })
    .filter((e) => e.vezesMedia >= MULTIPLICADOR_DESPESA_EXTRAORDINARIA)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, MAX_EXTRAORDINARIAS);

  // Por objetivo e por mês (mesmo formato do loader antigo).
  const somaPorObjetivo = new Map<string, number>();
  const somaPorMes = new Map<string, number>();
  for (const i of atual.itens) {
    if (i.objetivoId) somaPorObjetivo.set(i.objetivoId, (somaPorObjetivo.get(i.objetivoId) ?? 0) + i.valor);
    somaPorMes.set(i.competencia, (somaPorMes.get(i.competencia) ?? 0) + i.valor);
  }
  const porObjetivo: PontoObjetivo[] = [...somaPorObjetivo.entries()]
    .map(([objetivoId, subtotal]) => ({ objetivoId, objetivoRotulo: rotuloPorTermo.get(objetivoId) ?? "—", total: subtotal }))
    .sort((a, b) => b.total - a.total);
  const porMes: PontoMensal[] = [...somaPorMes.entries()].map(([mes, subtotal]) => ({ mes, total: subtotal })).sort((a, b) => a.mes.localeCompare(b.mes));

  const comparacao =
    anterior.total > 0
      ? {
          totalAnterior: anterior.total,
          variacao: (total - anterior.total) / anterior.total,
          rotuloAnterior: `${formatData(anteriorInicio)} – ${formatData(anteriorFim)}`,
        }
      : null;

  return {
    periodo,
    total,
    totalLancamentos,
    ticketMedio,
    comparacao,
    categorias,
    pressionadas,
    extraordinarias,
    porObjetivo,
    porMes,
  };
}
