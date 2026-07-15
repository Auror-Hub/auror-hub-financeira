import { notFound } from "next/navigation";
import { carregarRelatorioVersao } from "@/lib/relatorios/consulta";
import { ReportDetailScreen } from "@/components/domain/relatorios/ReportDetailScreen";

export default async function RelatorioVersaoPage({ params }: { params: Promise<{ versaoId: string }> }) {
  const { versaoId } = await params;
  const detalhe = await carregarRelatorioVersao(versaoId);
  if (!detalhe) notFound();

  return <ReportDetailScreen detalhe={detalhe} />;
}
