"use client";

import Link from "next/link";
import { CircleAlert, Lock } from "lucide-react";
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface CloseCompetencyModalProps {
  open: boolean;
  onClose: () => void;
  detalhe: CompetenciaDetalhe;
  onConfirmar: () => void;
}

/** SCR-COMP-CLOSE-001 — bloqueado quando há pendência obrigatória (RUL de fechamento). */
export function CloseCompetencyModal({ open, onClose, detalhe, onConfirmar }: CloseCompetencyModalProps) {
  const bloqueado = detalhe.lancamentosPendentes > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Fechar ${formatCompetencia(detalhe.competencia.mesReferencia)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          {!bloqueado && (
            <Button variant="success" size="sm" icon={<Lock size={14} strokeWidth={2} />} onClick={onConfirmar}>
              Confirmar fechamento
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-y-2 text-base">
          <dt className="text-text-muted">Total consolidado</dt>
          <dd className="text-right font-mono-nums text-text-primary">{formatBRL(detalhe.totalConsolidado)}</dd>
          <dt className="text-text-muted">Lançamentos</dt>
          <dd className="text-right font-mono-nums text-text-primary">{detalhe.totalLancamentos}</dd>
          <dt className="text-text-muted">Revisados</dt>
          <dd className="text-right font-mono-nums text-text-primary">{detalhe.lancamentosRevisados}</dd>
          <dt className="text-text-muted">Pendentes</dt>
          <dd className="text-right font-mono-nums text-text-primary">{detalhe.lancamentosPendentes}</dd>
        </dl>

        {bloqueado ? (
          <div className="flex items-start gap-2 rounded-card bg-state-danger-tint p-3 text-sm text-terra">
            <CircleAlert size={16} className="mt-0.5 shrink-0" strokeWidth={1.75} />
            <div className="flex flex-col gap-2">
              <span>
                Fechamento bloqueado — {detalhe.lancamentosPendentes} lançamento
                {detalhe.lancamentosPendentes === 1 ? "" : "s"} ainda aguarda
                {detalhe.lancamentosPendentes === 1 ? "" : "m"} revisão.
              </span>
              <Link href="/caixa-de-entrada" className="w-fit font-medium underline underline-offset-2">
                Ir para Caixa de Entrada
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-base text-text-secondary">
            Ao confirmar, esta competência gera um snapshot imutável e um relatório executivo. Reaberturas
            futuras criam uma nova versão — este fechamento nunca é apagado.
          </p>
        )}
      </div>
    </Modal>
  );
}
