import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarCompetenciaDetalhe } from "@/lib/competencias/consulta";
import { carregarInsightsDaCompetencia } from "@/lib/analise/consulta";
import { carregarVersaoVigentePorCompetencia } from "@/lib/relatorios/consulta";
import { carregarLancamentosDecididos } from "@/lib/historico/consulta";
import { CompetencyDetailScreen } from "@/components/domain/competencies/CompetencyDetailScreen";

export default async function CompetenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalhe = await carregarCompetenciaDetalhe(id);
  if (!detalhe) notFound();

  const { insights, recomendacoes } = await carregarInsightsDaCompetencia(id);
  const versaoRelatorioId = await carregarVersaoVigentePorCompetencia(id);

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

  // itensPorPagina bem alto — a proposta é justamente ver TODAS as despesas do mês antes de fechar, não paginar.
  const { itens: lancamentos } = await carregarLancamentosDecididos(
    { competenciaMes: detalhe.competencia.mesReferencia },
    1,
    10000,
  );

  return (
    <CompetencyDetailScreen
      detalheInicial={{ ...detalhe, insights, recomendacoes }}
      versaoRelatorioId={versaoRelatorioId}
      lancamentos={lancamentos}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
    />
  );
}
