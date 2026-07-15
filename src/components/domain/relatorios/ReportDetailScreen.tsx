"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import type { RelatorioVersaoDetalhe } from "@/lib/relatorios/consulta";
import { formatCompetencia, formatData } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ReportDetailScreenProps {
  detalhe: RelatorioVersaoDetalhe;
}

/** SCR-REPORT-DETAIL-001 — 14 seções renderizadas num iframe sandbox (conteúdo gerado por LLM nunca entra direto na árvore React). */
export function ReportDetailScreen({ detalhe }: ReportDetailScreenProps) {
  function exportarHtml() {
    const blob = new Blob([detalhe.conteudoHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${detalhe.mesReferencia}-v${detalhe.versao}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Relatório executivo</span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">{formatCompetencia(detalhe.mesReferencia)}</h1>
            <Badge tone={detalhe.status === "vigente" ? "green" : "slate"}>{detalhe.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/competencias/${detalhe.competenciaId}`}>
            <Button variant="secondary" size="sm">
              Ver competência
            </Button>
          </Link>
          <Button variant="secondary" size="sm" icon={<Download size={14} strokeWidth={1.75} />} onClick={exportarHtml}>
            Exportar HTML
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Metadados" />
        <dl className="grid grid-cols-2 gap-y-2 text-base">
          <dt className="text-text-muted">Versão</dt>
          <dd className="text-right text-text-primary">{detalhe.versao}</dd>
          <dt className="text-text-muted">Gerado em</dt>
          <dd className="text-right font-mono-nums text-text-primary">{formatData(detalhe.criadoEm.slice(0, 10))}</dd>
          <dt className="text-text-muted">Metodologia</dt>
          <dd className="text-right text-text-secondary">{detalhe.metodologia}</dd>
        </dl>
      </Card>

      <Card className="overflow-hidden p-0">
        <iframe
          sandbox="allow-same-origin"
          srcDoc={detalhe.conteudoHtml}
          title={`Relatório executivo — ${formatCompetencia(detalhe.mesReferencia)}`}
          className="h-[70vh] w-full"
        />
      </Card>
    </div>
  );
}
