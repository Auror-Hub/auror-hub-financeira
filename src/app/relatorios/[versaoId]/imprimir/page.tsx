import { notFound } from "next/navigation";
import { carregarRelatorioVersao } from "@/lib/relatorios/consulta";
import { ImprimirRelatorioScreen } from "@/components/domain/relatorios/ImprimirRelatorioScreen";

/**
 * Fase 10 (Auditoria V2): rota fora do grupo `(app)` de propósito — sem
 * NavRail/TopBar/ActionBar, só o conteúdo do relatório pronto pra impressão.
 * Autenticação/isolamento por família continuam garantidos por
 * `perfilDoUsuarioAutenticado()` (dentro de `carregarRelatorioVersao`) e pela
 * RLS de `relatorio_versoes`/`relatorios`/`competencias` — não depende de
 * middleware de rota.
 */
export default async function ImprimirRelatorioPage({ params }: { params: Promise<{ versaoId: string }> }) {
  const { versaoId } = await params;
  const detalhe = await carregarRelatorioVersao(versaoId);
  if (!detalhe) notFound();

  return <ImprimirRelatorioScreen detalhe={detalhe} />;
}
