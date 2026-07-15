"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import type { EstadoCompetencia } from "@/lib/domain/types";
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CompetencyStatusBadge } from "./CompetencyStatusBadge";

export interface CompetencyListScreenProps {
  detalhes: CompetenciaDetalhe[];
}

export function CompetencyListScreen({ detalhes }: CompetencyListScreenProps) {
  const todas = detalhes;
  const [filtro, setFiltro] = useState<EstadoCompetencia | "todas">("todas");

  const estadosPresentes = useMemo(
    () => Array.from(new Set(todas.map((d) => d.competencia.estado))),
    [todas],
  );

  const filtradas =
    filtro === "todas" ? todas : todas.filter((d) => d.competencia.estado === filtro);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-text-muted" strokeWidth={1.75} />
          <h1 className="text-xl font-semibold text-text-primary">Competências</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} strokeWidth={1.75} />}
          disabled
          title="Novas competências são criadas automaticamente ao importar uma fatura — chega na Etapa 2"
        >
          Nova competência
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFiltro("todas")}>
          <Badge tone={filtro === "todas" ? "indigo" : "slate"}>Todas</Badge>
        </button>
        {estadosPresentes.map((e) => (
          <button key={e} onClick={() => setFiltro(e)}>
            <Badge tone={filtro === e ? "indigo" : "slate"}>{e}</Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtradas.map((d) => (
          <Link key={d.competencia.id} href={`/competencias/${d.competencia.id}`}>
            <Card className="transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-medium text-text-primary">
                    {formatCompetencia(d.competencia.mesReferencia)}
                  </span>
                  <CompetencyStatusBadge estado={d.competencia.estado} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono-nums text-lg font-semibold text-text-primary">
                    {formatBRL(d.totalConsolidado)}
                  </span>
                  <span className="text-sm text-text-muted">
                    {d.lancamentosPendentes > 0
                      ? `${d.lancamentosPendentes} pendente${d.lancamentosPendentes === 1 ? "" : "s"}`
                      : "sem pendências"}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {filtradas.length === 0 && (
          <p className="rounded-card bg-surface-primary p-6 text-center text-base text-text-muted shadow-[var(--shadow-card)]">
            Nenhuma competência para este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
