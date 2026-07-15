"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox, Lock, RotateCcw, Sparkles } from "lucide-react";
import type { CompetenciaDetalhe, MotivoReabertura } from "@/lib/domain/competency";
import { fecharCompetencia, reabrirCompetencia } from "@/lib/competencias/acoes";
import { formatBRL, formatCompetencia, formatData } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Button } from "@/components/ui/Button";
import { CompetencyStatusBadge } from "./CompetencyStatusBadge";
import { CloseCompetencyModal } from "./CloseCompetencyModal";
import { ReopenCompetencyModal } from "./ReopenCompetencyModal";

export function CompetencyDetailScreen({ detalheInicial: detalhe }: { detalheInicial: CompetenciaDetalhe }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modalFechar, setModalFechar] = useState(false);
  const [modalReabrir, setModalReabrir] = useState(false);

  const podeReabrir = detalhe.competencia.estado === "fechada";
  const podeFechar =
    detalhe.competencia.estado === "em revisão" ||
    detalhe.competencia.estado === "pronta" ||
    detalhe.competencia.estado === "reaberta";

  function confirmarFechamento() {
    setErro(null);
    startTransition(async () => {
      try {
        await fecharCompetencia(detalhe.competencia.id);
        setModalFechar(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao fechar a competência.");
      }
    });
  }

  function confirmarReabertura(motivo: MotivoReabertura, detalheMotivo: string) {
    setErro(null);
    startTransition(async () => {
      try {
        await reabrirCompetencia(detalhe.competencia.id, motivo, detalheMotivo);
        setModalReabrir(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao reabrir a competência.");
      }
    });
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
              disabled={pendente}
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
              disabled={pendente}
              onClick={() => setModalReabrir(true)}
            >
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {erro && <p className="text-sm text-terra">{erro}</p>}

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
          <Card className="flex items-start gap-2 bg-surface-secondary">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-text-muted" strokeWidth={1.75} />
            <p className="text-sm text-text-muted">
              Análises interpretativas (Agente Analista) chegam na Fase 6+7 — esta tela mostra só o consolidado
              numérico congelado ao fechar.
            </p>
          </Card>

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
              <p className="text-base text-text-secondary">
                Snapshot consolidado disponível (gerado ao fechar). Relatório executivo narrado chega na Fase 6+7.
              </p>
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
