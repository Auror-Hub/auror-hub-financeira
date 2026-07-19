"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { decidirRecomendacao, type DecisaoRecomendacao } from "@/lib/home/acoes";
import type { Recomendacao } from "@/lib/domain/types";

/**
 * Rearquitetura (Fase 1, ADR-007): uma única recomendação em destaque na
 * Home, com decisão explícita (não é só "mostrar e esquecer") — registrada
 * em `recomendacoes_decisoes`, nunca sobrescrita.
 */
export function RecomendacaoDestaque({ recomendacao }: { recomendacao: Recomendacao }) {
  const [decidindo, setDecidindo] = useState(false);
  const [decidida, setDecidida] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function decidir(decisao: DecisaoRecomendacao) {
    setDecidindo(true);
    setErro(null);
    try {
      await decidirRecomendacao(recomendacao.id, decisao);
      setDecidida(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar decisão.");
    } finally {
      setDecidindo(false);
    }
  }

  if (decidida) return null;

  return (
    <Card accent="slate" className="flex flex-col gap-3 p-3.5">
      <div className="flex items-start gap-2">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-state-neutral" strokeWidth={1.75} />
        <p className="text-base leading-relaxed text-text-secondary">{recomendacao.texto}</p>
      </div>
      {erro && <p className="text-sm text-terra">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={decidindo}
          onClick={() => decidir("aceitou")}
          className="rounded-btn-sm bg-action-primary px-3 py-1.5 text-sm font-medium text-action-on-primary hover:bg-action-primary-hover disabled:opacity-50"
        >
          Aceitar
        </button>
        <button
          type="button"
          disabled={decidindo}
          onClick={() => decidir("agora não")}
          className="rounded-btn-sm bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-hover disabled:opacity-50"
        >
          Agora não
        </button>
        <button
          type="button"
          disabled={decidindo}
          onClick={() => decidir("não sugerir de novo")}
          className="rounded-btn-sm px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          Não sugerir de novo
        </button>
      </div>
    </Card>
  );
}
