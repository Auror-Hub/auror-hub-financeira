"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { MOTIVOS_REABERTURA, type MotivoReabertura } from "@/lib/domain/competency";
import { formatCompetencia } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ReopenCompetencyModalProps {
  open: boolean;
  onClose: () => void;
  detalhe: CompetenciaDetalhe;
  onConfirmar: (motivo: MotivoReabertura, detalheMotivo: string) => void;
}

/** SCR-COMP-REOPEN-001 — motivo é sempre obrigatório; versão anterior nunca é apagada. */
export function ReopenCompetencyModal({ open, onClose, detalhe, onConfirmar }: ReopenCompetencyModalProps) {
  const [motivo, setMotivo] = useState<MotivoReabertura | "">("");
  const [detalheMotivo, setDetalheMotivo] = useState("");

  function fechar() {
    setMotivo("");
    setDetalheMotivo("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={`Reabrir ${formatCompetencia(detalhe.competencia.mesReferencia)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<RotateCcw size={14} strokeWidth={2} />}
            disabled={!motivo}
            onClick={() => {
              if (!motivo) return;
              onConfirmar(motivo, detalheMotivo);
              fechar();
            }}
          >
            Confirmar reabertura
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-text-secondary">
          O relatório e o fechamento atuais (versão {detalhe.versoesFechamento.at(-1)?.versao ?? 1}) permanecem
          preservados e acessíveis. Reabrir cria uma nova versão — nada é sobrescrito.
        </p>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Motivo da reabertura (obrigatório)
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoReabertura)}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            <option value="">Selecionar</option>
            {MOTIVOS_REABERTURA.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Detalhe (opcional)
          <textarea
            value={detalheMotivo}
            onChange={(e) => setDetalheMotivo(e.target.value)}
            rows={3}
            placeholder="Ex.: chegou a segunda via corrigida da fatura"
            className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
          />
        </label>
      </div>
    </Modal>
  );
}
