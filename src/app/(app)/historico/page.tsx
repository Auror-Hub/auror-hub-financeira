import { createClient } from "@/lib/supabase/server";
import { carregarLancamentosDecididos } from "@/lib/historico/consulta";
import { HistoryListScreen } from "@/components/domain/historico/HistoryListScreen";

interface SearchParams {
  categoriaId?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: string;
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const filtros = {
    categoriaId: params.categoriaId,
    fornecedor: params.fornecedor,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  };
  const pagina = Number(params.pagina ?? "1") || 1;

  const resultado = await carregarLancamentosDecididos(filtros, pagina);

  return <HistoryListScreen resultado={resultado} categorias={categorias} objetivos={objetivos} filtrosAtuais={filtros} />;
}
