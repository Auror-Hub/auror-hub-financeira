import { CalendarRange } from "lucide-react";
import { formatBRL, formatCompetencia } from "@/lib/format";
import type { Projecao } from "@/lib/metas/projecao";
import type { MetaComProgresso } from "@/lib/metas/consulta";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { MetaListScreen, type MetaListScreenProps } from "./MetaListScreen";

export interface MeuPlanoScreenProps extends Omit<MetaListScreenProps, "metas"> {
  metas: MetaComProgresso[];
  mesReferencia: string;
  gastoAtualAbs: number;
  planejadoTotal: number | null;
  projecao: Projecao | null;
}

/**
 * Rearquitetura (Fase 2, ADR-007): tela-contêiner "Meu plano" — embute o
 * MetaListScreen já existente (não reescrito) e adiciona a visão mensal
 * (planejado total, gasto atual, projeção de fim de mês).
 */
export function MeuPlanoScreen({
  metas,
  mesReferencia,
  gastoAtualAbs,
  planejadoTotal,
  projecao,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: MeuPlanoScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarRange size={18} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Meu plano</h1>
        <span className="text-sm text-text-muted">· {formatCompetencia(mesReferencia)}</span>
      </div>

      <KpiStrip>
        {planejadoTotal !== null && <KpiTile label="Planejado (soma das metas ativas)" value={formatBRL(planejadoTotal)} />}
        <KpiTile label="Gasto atual" value={formatBRL(gastoAtualAbs)} />
        {planejadoTotal !== null && (
          <KpiTile
            label="Restante do planejado"
            value={formatBRL(planejadoTotal - gastoAtualAbs)}
            tone={planejadoTotal - gastoAtualAbs < 0 ? "warning" : "success"}
          />
        )}
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
