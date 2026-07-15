import { ReportListScreen } from "@/components/domain/relatorios/ReportListScreen";
import { carregarRelatorios } from "@/lib/relatorios/consulta";

export default async function RelatoriosPage() {
  const relatorios = await carregarRelatorios();
  return <ReportListScreen relatorios={relatorios} />;
}
