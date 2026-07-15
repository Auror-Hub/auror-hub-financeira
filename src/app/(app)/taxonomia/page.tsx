import { carregarTodosOsTermos } from "@/lib/taxonomia/consulta";
import { TaxonomyManagerScreen } from "@/components/domain/taxonomia/TaxonomyManagerScreen";

export default async function TaxonomiaPage() {
  const termos = await carregarTodosOsTermos();
  return <TaxonomyManagerScreen termos={termos} />;
}
