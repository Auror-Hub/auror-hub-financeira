import { notFound } from "next/navigation";
import { getCompetenciaDetalhe } from "@/lib/mocks/competencies";
import { CompetencyDetailScreen } from "@/components/domain/competencies/CompetencyDetailScreen";

export default async function CompetenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalhe = getCompetenciaDetalhe(id);
  if (!detalhe) notFound();

  return <CompetencyDetailScreen detalheInicial={detalhe} />;
}
