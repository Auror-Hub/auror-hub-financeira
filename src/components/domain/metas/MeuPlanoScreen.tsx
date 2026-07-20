import { CalendarRange } from "lucide-react";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { classificarFrescor, rotuloFrescor } from "@/lib/data/frescor";
import type { EstadoCompetencia } from "@/lib/domain/types";
import type { Projecao } from "@/lib/metas/projecao";
import type { MetaComProgresso } from "@/lib/metas/consulta";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { MetaListScreen, type MetaListScreenProps } from "./MetaListScreen";

export interface MeuPlanoScreenProps extends Omit<MetaListScreenProps, "metas"> {
  metas: MetaComProgresso[];
  mesReferencia: string;
  estadoCompetencia: EstadoCompetencia | null;
  ultimaAtualizacao: string | null;
  gastoAtualAbs: number;
  projecao: Projecao | null;
}

/**
 * Rearquitetura (Fase 2, ADR-007): tela-contêiner "Meu plano" — embute o
 * MetaListScreen já existente (não reescrito) e adiciona a visão mensal
 * (gasto atual, projeção de fim de mês). "Planejado"/"Restante" saíram do ar
 * na Fase 5 (auditoria V2) — a soma das metas ativas conta o mesmo gasto
 * várias vezes (geral + categoria + objetivo se sobrepõem por design). Volta
 * na Fase 8, correto, vindo de um plano mensal aditivo (`plano_linhas`).
 */
export function MeuPlanoScreen({
  metas,
  mesReferencia,
  estadoCompetencia,
  ultimaAtualizacao,
  gastoAtualAbs,
  projecao,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: MeuPlanoScreenProps) {
  const hoje = new Date();
  const frescor = estadoCompetencia ? classificarFrescor(estadoCompetencia, ultimaAtualizacao, hoje) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-text-muted" strokeWidth={1.75} />
          <h1 className="text-xl font-semibold text-text-primary">Meu plano</h1>
          <span className="text-sm text-text-muted">· {formatCompetencia(mesReferencia)}</span>
        </div>
        {frescor && (
          <p className={`text-sm ${frescor === "desatualizada" ? "text-state-warning" : "text-text-muted"}`}>
            {rotuloFrescor(frescor, ultimaAtualizacao, hoje)}
          </p>
        )}
      </div>

      <KpiStrip>
        <KpiTile label="Gasto atual" value={formatBRL(gastoAtualAbs)} />
      </KpiStrip>

      {projecao && (
        <Card>
          <CardHeader title="Projeção de fim do mês" />
          <p className="text-2xl font-semibold text-text-primary">{formatBRL(projecao.estimativa)}</p>
          <p className="mt-1 text-sm text-text-muted">
            Estimativa pelo ritmo de gasto atual, entre {formatBRL(projecao.minimo)} e {formatBRL(projecao.maximo)} — não é uma
            previsão precisa, é a continuação do ritmo dos dias já decorridos.
          </p>
        </Card>
      )}

      <MetaListScreen metas={metas} categorias={categorias} subcategoriasPorCategoria={subcategoriasPorCategoria} objetivos={objetivos} />
    </div>
  );
}
