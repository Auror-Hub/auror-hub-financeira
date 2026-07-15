import { CompetencyListScreen } from "@/components/domain/competencies/CompetencyListScreen";
import { carregarCompetencias } from "@/lib/competencias/consulta";

export default async function CompetenciasPage() {
  const detalhes = await carregarCompetencias();
  return <CompetencyListScreen detalhes={detalhes} />;
}
