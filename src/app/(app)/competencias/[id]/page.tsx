import { notFound } from "next/navigation";
import { carregarCompetenciaDetalhe } from "@/lib/competencias/consulta";
import { CompetencyDetailScreen } from "@/components/domain/competencies/CompetencyDetailScreen";

export default async function CompetenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalhe = await carregarCompetenciaDetalhe(id);
  if (!detalhe) notFound();

  return <CompetencyDetailScreen detalheInicial={detalhe} />;
}
