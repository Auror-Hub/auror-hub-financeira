import { createClient } from "@/lib/supabase/server";
import { carregarLancamentosDecididos } from "@/lib/historico/consulta";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { HistoryListScreen } from "@/components/domain/historico/HistoryListScreen";

interface SearchParams {
  categoriaId?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  competenciaMes?: string;
  pagina?: string;
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: taxonomia } = await supabase
    .from("taxonomia_termos")
    .select("id, dimensao, rotulo, termo_pai_id")
    .eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]> = {};
  for (const t of taxonomia ?? []) {
    if (t.dimensao !== "subcategoria" || !t.termo_pai_id) continue;
    const paiId = t.termo_pai_id as string;
    (subcategoriasPorCategoria[paiId] ??= []).push({ id: t.id as string, rotulo: t.rotulo as string });
  }

  const competencias = await carregarCompetencias();

  const filtros = {
    categoriaId: params.categoriaId,
    fornecedor: params.fornecedor,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    competenciaMes: params.competenciaMes,
  };
  const pagina = Number(params.pagina ?? "1") || 1;

  const resultado = await carregarLancamentosDecididos(filtros, pagina);

  return (
    <HistoryListScreen
      resultado={resultado}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
      competencias={competencias.map((c) => c.competencia.mesReferencia)}
      filtrosAtuais={filtros}
    />
  );
}
