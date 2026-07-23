import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import { carregarLancamentosComCategoria, type LancamentoComCategoria } from "@/lib/lancamentos/porCategoria";
import { agregarLancamentos } from "@/lib/lancamentos/agregador";
import { mesesAnteriores } from "@/lib/data/competencia";
import { avaliarProgresso, type StatusProgressoMeta } from "./avaliacao";

const ROTULO_META_GERAL = "Orçamento geral";

export type TipoMeta = "limite_absoluto" | "reducao_percentual";

export interface MetaComProgresso {
  id: string;
  tipo: TipoMeta;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
  rotuloCompleto: string;
  /** Só presente pra tipo 'limite_absoluto'. */
  valorLimite: number | null;
  periodoMeses: number | null;
  percentualAlvo: number | null;
  /** Média histórica usada como base — só presente pra tipo 'reducao_percentual'. */
  baselineMedia: number | null;
  /** O número de fato usado na avaliação — fixo (limite_absoluto) ou calculado da baseline (reducao_percentual). */
  valorLimiteEfetivo: number;
  gastoAtual: number;
  percentual: number;
  statusProgresso: StatusProgressoMeta;
  status: "ativa" | "inativa";
  criadoEm: string;
}

interface MetaRaw {
  id: string;
  tipo: TipoMeta;
  categoria_id: string | null;
  subcategoria_id: string | null;
  objetivo_id: string | null;
  valor_limite: number | null;
  periodo_meses: number | null;
  percentual_alvo: number | null;
  status: "ativa" | "inativa";
  criado_em: string;
}

function correspondeMeta(l: LancamentoComCategoria, meta: MetaRaw): boolean {
  if (meta.categoria_id && l.categoriaId !== meta.categoria_id) return false;
  if (meta.subcategoria_id && l.subcategoriaId !== meta.subcategoria_id) return false;
  if (meta.objetivo_id && l.objetivoId !== meta.objetivo_id) return false;
  return true;
}

/** Gasto líquido (despesas − créditos/estornos) do escopo da meta — Fase 14, Auditoria V3.1. */
function somaFiltrada(lancamentos: LancamentoComCategoria[], meta: MetaRaw): number {
  return agregarLancamentos(lancamentos.filter((l) => correspondeMeta(l, meta))).gastoLiquido;
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
    .select("id, tipo, categoria_id, subcategoria_id, objetivo_id, valor_limite, periodo_meses, percentual_alvo, status, criado_em")
    .order("criado_em", { ascending: false });
  if (errM) throw new Error("Falha ao carregar metas: " + errM.message);
  const metas = (metasRaw ?? []) as MetaRaw[];
  if (metas.length === 0) return [];

  const idsTermos = new Set<string>();
  for (const m of metas) {
    if (m.categoria_id) idsTermos.add(m.categoria_id);
    if (m.subcategoria_id) idsTermos.add(m.subcategoria_id);
    if (m.objetivo_id) idsTermos.add(m.objetivo_id);
  }
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const competencias = await carregarCompetencias();
  const mesAtual = competencias[0]?.competencia.mesReferencia;

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  const inativos = await carregarIdsInativos(supabase, perfilId);

  const lancamentosAtual = mesAtual ? await carregarLancamentosComCategoria(supabase, cartaoIds, [mesAtual], inativos) : [];

  // Só busca histórico se houver ao menos 1 meta de redução % ativa — evita
  // query extra quando o app só usa metas de limite fixo.
  const periodosNecessarios = new Set(
    metas.filter((m) => m.tipo === "reducao_percentual" && m.periodo_meses).map((m) => m.periodo_meses as number),
  );
  const lancamentosPorPeriodo = new Map<number, LancamentoComCategoria[]>();
  for (const periodo of periodosNecessarios) {
    const meses = mesAtual ? mesesAnteriores(mesAtual, periodo) : [];
    lancamentosPorPeriodo.set(periodo, meses.length ? await carregarLancamentosComCategoria(supabase, cartaoIds, meses, inativos) : []);
  }

  return metas.map((m) => {
    const rotulos = [m.categoria_id, m.subcategoria_id, m.objetivo_id]
      .filter((id): id is string => id !== null)
      .map((id) => rotuloPorTermo.get(id) ?? "—");
    const rotuloCompleto = rotulos.length > 0 ? rotulos.join(" · ") : ROTULO_META_GERAL;

    const gastoAtual = somaFiltrada(lancamentosAtual, m);

    let valorLimiteEfetivo: number;
    let baselineMedia: number | null = null;
    if (m.tipo === "limite_absoluto") {
      valorLimiteEfetivo = m.valor_limite as number;
    } else {
      const lancamentosHistorico = lancamentosPorPeriodo.get(m.periodo_meses as number) ?? [];
      const somaHistorico = somaFiltrada(lancamentosHistorico, m);
      baselineMedia = somaHistorico / (m.periodo_meses as number);
      valorLimiteEfetivo = Math.round(baselineMedia * (1 - (m.percentual_alvo as number)));
    }

    const { percentual, status: statusProgresso } = avaliarProgresso(valorLimiteEfetivo, gastoAtual);

    return {
      id: m.id,
      tipo: m.tipo,
      categoriaId: m.categoria_id,
      subcategoriaId: m.subcategoria_id,
      objetivoId: m.objetivo_id,
      rotuloCompleto,
      valorLimite: m.valor_limite,
      periodoMeses: m.periodo_meses,
      percentualAlvo: m.percentual_alvo,
      baselineMedia,
      valorLimiteEfetivo,
      gastoAtual,
      percentual,
      statusProgresso,
      status: m.status,
      criadoEm: m.criado_em,
    };
  });
}
