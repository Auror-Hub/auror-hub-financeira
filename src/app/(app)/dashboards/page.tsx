import { createClient } from "@/lib/supabase/server";
import { carregarDadosDashboard } from "@/lib/dashboards/consulta";
import { DashboardScreen } from "@/components/domain/dashboards/DashboardScreen";

interface SearchParams {
  dataInicio?: string;
  dataFim?: string;
  categoriaId?: string;
  objetivoId?: string;
}

function dataIsoDeDiasAtras(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString().slice(0, 10);
}

export default async function DashboardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    dataInicio: params.dataInicio || dataIsoDeDiasAtras(90),
    dataFim: params.dataFim || dataIsoDeDiasAtras(0),
    categoriaId: params.categoriaId,
    objetivoId: params.objetivoId,
  };

  const dados = await carregarDadosDashboard(filtros);

  return <DashboardScreen dados={dados} categorias={categorias} objetivos={objetivos} filtrosAtuais={filtros} />;
}
