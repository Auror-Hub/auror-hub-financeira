"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Inbox, Lock, RotateCcw } from "lucide-react";
import type { CompetenciaDetalhe, MotivoReabertura } from "@/lib/domain/competency";
import type { EstadoCompetencia } from "@/lib/domain/types";
import { formatBRL, formatCompetencia, formatData } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Button } from "@/components/ui/Button";
import { InsightNarrative } from "@/components/domain/home/InsightNarrative";
import { CompetencyStatusBadge } from "./CompetencyStatusBadge";
import { CloseCompetencyModal } from "./CloseCompetencyModal";
import { ReopenCompetencyModal } from "./ReopenCompetencyModal";

export function CompetencyDetailScreen({ detalheInicial }: { detalheInicial: CompetenciaDetalhe }) {
  const [detalhe, setDetalhe] = useState(detalheInicial);
  const [modalFechar, setModalFechar] = useState(false);
  const [modalReabrir, setModalReabrir] = useState(false);

  const podeReabrir = detalhe.competencia.estado === "fechada";
  const podeFechar =
    detalhe.competencia.estado === "em revisão" ||
    detalhe.competencia.estado === "pronta" ||
    detalhe.competencia.estado === "reaberta";

  function confirmarFechamento() {
    const novaVersao = (detalhe.versoesFechamento.at(-1)?.versao ?? 0) + 1;
    setDetalhe((d) => ({
      ...d,
      competencia: { ...d.competencia, estado: "fechada" as EstadoCompetencia },
      versoesFechamento: [...d.versoesFechamento, { versao: novaVersao, fechadoEm: new Date().toISOString() }],
      relatorioDisponivel: true,
    }));
    setModalFechar(false);
  }

  function confirmarReabertura(motivo: MotivoReabertura, detalheMotivo: string) {
    setDetalhe((d) => ({
      ...d,
      competencia: { ...d.competencia, estado: "reaberta" as EstadoCompetencia },
      versoesFechamento: [
        ...d.versoesFechamento,
        {
          versao: (d.versoesFechamento.at(-1)?.versao ?? 0) + 1,
          motivoReaberturaAnterior: detalheMotivo ? `${motivo}: ${detalheMotivo}` : motivo,
          fechadoEm: "",
        },
      ],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Competência</span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">
              {formatCompetencia(detalhe.competencia.mesReferencia)}
            </h1>
            <CompetencyStatusBadge estado={detalhe.competencia.estado} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/caixa-de-entrada">
            <Button variant="secondary" size="sm" icon={<Inbox size={14} strokeWidth={1.75} />}>
              Caixa de Entrada
            </Button>
          </Link>
          {podeFechar && (
            <Button
              variant="success"
              size="sm"
              icon={<Lock size={14} strokeWidth={1.75} />}
              onClick={() => setModalFechar(true)}
            >
              Fechar
            </Button>
          )}
          {podeReabrir && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} strokeWidth={1.75} />}
              onClick={() => setModalReabrir(true)}
            >
              Reabrir
            </Button>
          )}
        </div>
      </div>

      <KpiStrip>
        <KpiTile label="Total consolidado" value={formatBRL(detalhe.totalConsolidado)} />
        <KpiTile label="Lançamentos" value={String(detalhe.totalLancamentos)} />
        <KpiTile label="Revisados" value={String(detalhe.lancamentosRevisados)} />
        <KpiTile
          label="Pendentes"
          value={String(detalhe.lancamentosPendentes)}
          tone={detalhe.lancamentosPendentes > 0 ? "warning" : "success"}
        />
      </KpiStrip>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {detalhe.insights.length > 0 && (
            <section className="flex flex-col gap-3">
              <span className="eyebrow">Análises preliminares</span>
              {detalhe.insights.map((i) => (
                <InsightNarrative key={i.id} insight={i} />
              ))}
            </section>
          )}

          <Card>
            <CardHeader title="Documentos de origem" count={detalhe.documentos.length} />
            <ul className="flex flex-col divide-y divide-border-subtle">
              {detalhe.documentos.map((doc) => (
                <li key={doc.nomeArquivo} className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="text-base text-text-primary">{doc.nomeArquivo}</span>
                    <span className="text-sm text-text-muted">{doc.cartaoNome}</span>
                  </div>
                  <span className="font-mono-nums text-base text-text-primary">
                    {formatBRL(doc.totalDeclarado)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Relatório" />
            {detalhe.relatorioDisponivel ? (
              <Link
                href="/relatorios"
                className="flex items-center gap-2 text-base text-action-primary hover:underline"
              >
                <FileText size={16} strokeWidth={1.75} />
                Ver relatório executivo
              </Link>
            ) : (
              <p className="text-base text-text-muted">Gerado automaticamente ao fechar a competência.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Versões de fechamento" count={detalhe.versoesFechamento.length} />
            {detalhe.versoesFechamento.length === 0 ? (
              <p className="text-base text-text-muted">Ainda não fechada.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {[...detalhe.versoesFechamento].reverse().map((v) => (
                  <li key={v.versao} className="flex flex-col gap-0.5 text-base">
                    <span className="font-medium text-text-primary">Versão {v.versao}</span>
                    {v.motivoReaberturaAnterior && (
                      <span className="text-sm text-text-muted">Motivo: {v.motivoReaberturaAnterior}</span>
                    )}
                    {v.fechadoEm && (
                      <span className="font-mono-nums text-sm text-text-muted">
                        {formatData(v.fechadoEm.slice(0, 10))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <CloseCompetencyModal
        open={modalFechar}
        onClose={() => setModalFechar(false)}
        detalhe={detalhe}
        onConfirmar={confirmarFechamento}
      />
      <ReopenCompetencyModal
        open={modalReabrir}
        onClose={() => setModalReabrir(false)}
        detalhe={detalhe}
        onConfirmar={confirmarReabertura}
      />
    </div>
  );
}
