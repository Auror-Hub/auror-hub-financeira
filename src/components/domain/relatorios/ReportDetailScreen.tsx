"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { RelatorioVersaoDetalhe } from "@/lib/relatorios/consulta";
import type { SecaoRelatorio } from "@/lib/relatorios/narrador";
import { formatCompetencia, formatData } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ReportDetailScreenProps {
  detalhe: RelatorioVersaoDetalhe;
}

/**
 * SCR-REPORT-DETAIL-001 — Fase 10 (Auditoria V2): quando `secoesEstruturadas`
 * existe, renderiza nativamente (texto plano do narrador → parágrafos/listas
 * React — nunca `dangerouslySetInnerHTML`, o texto do modelo nunca é HTML).
 * Relatórios gerados antes desta fase não têm `secoesEstruturadas` — caem no
 * iframe sandbox com `conteudoHtml`, mesmo comportamento de sempre.
 */
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
      <Link href="/relatorios" className="flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={14} strokeWidth={1.75} />
        Relatórios
      </Link>
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
          <Link href={`/relatorios/${detalhe.versaoId}/imprimir`} target="_blank">
            <Button variant="secondary" size="sm" icon={<Printer size={14} strokeWidth={1.75} />}>
              Imprimir / Exportar PDF
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

      {detalhe.secoesEstruturadas ? (
        <Card className="flex flex-col gap-6">
          {detalhe.secoesEstruturadas.map((secao) => (
            <SecaoRelatorioView key={secao.slug} secao={secao} />
          ))}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <iframe
            sandbox="allow-same-origin"
            srcDoc={detalhe.conteudoHtml}
            title={`Relatório executivo — ${formatCompetencia(detalhe.mesReferencia)}`}
            className="h-[70vh] w-full"
          />
        </Card>
      )}
    </div>
  );
}

/** Corpo em texto plano (parágrafos por linha em branco, itens "- ") renderizado como nós de texto React — nunca HTML injetado. */
export function SecaoRelatorioView({ secao }: { secao: SecaoRelatorio }) {
  const blocos = secao.corpo.split(/\n\s*\n/);

  return (
    <div className="flex flex-col gap-2 border-b border-border-subtle pb-5 last:border-0 last:pb-0">
      <h2 className="text-lg font-semibold text-text-primary">{secao.titulo}</h2>
      {blocos.map((bloco, i) => {
        const linhas = bloco
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (linhas.length > 0 && linhas.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc pl-5 text-base text-text-secondary">
              {linhas.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-base text-text-secondary">
            {bloco.trim()}
          </p>
        );
      })}
    </div>
  );
}
