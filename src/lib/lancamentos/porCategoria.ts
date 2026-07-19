import "server-only";
import type { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface LancamentoComCategoria {
  fornecedor: string;
  valorAbs: number;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
}

/**
 * Lançamentos de uma ou mais competências (por `competencia_calculada`, nunca
 * intervalo de datas — competência pode divergir da data do lançamento) com a
 * categoria/subcategoria/objetivo da decisão vigente resolvidos. Compartilhado
 * entre Home e Metas (mesma definição de "gasto real do mês").
 */
export async function carregarLancamentosComCategoria(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  cartaoIds: string[],
  mesesReferencia: string[],
  inativos: Set<string>,
): Promise<LancamentoComCategoria[]> {
  if (cartaoIds.length === 0 || mesesReferencia.length === 0) return [];

  const { data: lancamentosRaw, error: errL } = await supabase
    .from("lancamentos_brutos")
    .select("id, fornecedor_original, valor")
    .in("cartao_id", cartaoIds)
    .in("competencia_calculada", mesesReferencia);
  if (errL) throw new Error("Falha ao carregar lançamentos: " + errL.message);
  const lancamentos = (lancamentosRaw ?? []).filter((l) => !inativos.has(l.id as string));
  if (lancamentos.length === 0) return [];

  const idsLancamentos = lancamentos.map((l) => l.id as string);
  const { data: decisoesRaw, error: errDec } = await supabase
    .from("classificacao_decisoes")
    .select("lancamento_id, categoria_id, subcategoria_id, objetivo_id, versao")
    .in("lancamento_id", idsLancamentos)
    .order("versao", { ascending: true });
  if (errDec) throw new Error("Falha ao carregar decisões: " + errDec.message);

  const decisaoPorLancamento = new Map<string, { categoriaId: string | null; subcategoriaId: string | null; objetivoId: string | null }>();
  for (const d of decisoesRaw ?? []) {
    decisaoPorLancamento.set(d.lancamento_id as string, {
      categoriaId: d.categoria_id as string | null,
      subcategoriaId: d.subcategoria_id as string | null,
      objetivoId: d.objetivo_id as string | null,
    });
  }

  return lancamentos.map((l) => {
    const decisao = decisaoPorLancamento.get(l.id as string);
    return {
      fornecedor: l.fornecedor_original as string,
      valorAbs: Math.abs(l.valor as number),
      categoriaId: decisao?.categoriaId ?? null,
      subcategoriaId: decisao?.subcategoriaId ?? null,
      objetivoId: decisao?.objetivoId ?? null,
    };
  });
}
