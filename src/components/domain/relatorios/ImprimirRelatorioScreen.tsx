"use client";

import { Printer } from "lucide-react";
import type { RelatorioVersaoDetalhe } from "@/lib/relatorios/consulta";
import { formatCompetencia, formatData } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { SecaoRelatorioView } from "./ReportDetailScreen";

export interface ImprimirRelatorioScreenProps {
  detalhe: RelatorioVersaoDetalhe;
}

/**
 * Fase 10 (Auditoria V2): versão de impressão/PDF — rota própria fora do
 * shell (sem NavRail/TopBar), `window.print()` em vez de dependência de lib
 * de PDF server-side (pesada pra função serverless do Netlify). Só relatórios
 * com `secoesEstruturadas` (Fase 10+) têm impressão nativa — os anteriores
 * seguem exportáveis via "Exportar HTML" na tela de detalhe.
 */
export function ImprimirRelatorioScreen({ detalhe }: ImprimirRelatorioScreenProps) {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="primary" size="sm" icon={<Printer size={14} strokeWidth={1.75} />} onClick={() => window.print()}>
          Imprimir / Exportar PDF
        </Button>
      </div>

      <div className="flex flex-col gap-1 border-b border-border-subtle pb-4">
        <span className="text-sm text-text-muted">Relatório executivo</span>
        <h1 className="text-2xl font-semibold text-text-primary">{formatCompetencia(detalhe.mesReferencia)}</h1>
        <span className="text-sm text-text-muted">
          Versão {detalhe.versao} · Gerado em {formatData(detalhe.criadoEm.slice(0, 10))}
        </span>
      </div>

      {detalhe.secoesEstruturadas ? (
        <div className="flex flex-col gap-6">
          {detalhe.secoesEstruturadas.map((secao) => (
            <SecaoRelatorioView key={secao.slug} secao={secao} />
          ))}
        </div>
      ) : (
        <p className="text-base text-text-secondary">
          Este relatório foi gerado antes da impressão nativa existir. Use &ldquo;Exportar HTML&rdquo; na tela do relatório e
          imprima o arquivo exportado.
        </p>
      )}
    </div>
  );
}
