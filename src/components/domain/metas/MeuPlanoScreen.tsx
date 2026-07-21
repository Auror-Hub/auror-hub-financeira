import { CalendarRange } from "lucide-react";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { classificarFrescor, rotuloFrescor } from "@/lib/data/frescor";
import type { EstadoCompetencia } from "@/lib/domain/types";
import type { Projecao } from "@/lib/metas/projecao";
import type { MetaComProgresso } from "@/lib/metas/consulta";
import type { PlanoMensal } from "@/lib/plano/consulta";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { MetaListScreen, type MetaListScreenProps } from "./MetaListScreen";
import { PlanoMensalSection } from "./PlanoMensalSection";

export interface MeuPlanoScreenProps extends Omit<MetaListScreenProps, "metas"> {
  metas: MetaComProgresso[];
  mesReferencia: string;
  mesAnterior: string;
  estadoCompetencia: EstadoCompetencia | null;
  ultimaAtualizacao: string | null;
  gastoAtualAbs: number;
  projecao: Projecao | null;
  plano: PlanoMensal;
  planoAnteriorDisponivel: boolean;
}

/**
 * Rearquitetura (Fase 2, ADR-007): tela-contêiner "Meu plano" — embute o
 * MetaListScreen já existente e adiciona a visão mensal (gasto atual,
 * projeção). "Planejado"/"Restante" voltaram na Fase 8 (Auditoria V2),
 * agora sourced de `plano` (plano_linhas, aditivo por construção) — nunca
 * da soma de `metas`, que podem se sobrepor por design.
 */
export function MeuPlanoScreen({
  metas,
  mesReferencia,
  mesAnterior,
  estadoCompetencia,
  ultimaAtualizacao,
  gastoAtualAbs,
  projecao,
  plano,
  planoAnteriorDisponivel,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: MeuPlanoScreenProps) {
  const hoje = new Date();
  const frescor = estadoCompetencia ? classificarFrescor(estadoCompetencia, ultimaAtualizacao, hoje) : null;
  const planejado = plano.linhas.length > 0 ? plano.total : null;
  const restante = planejado !== null ? planejado - gastoAtualAbs : null;

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
        {planejado !== null && <KpiTile label="Planejado" value={formatBRL(planejado)} />}
        <KpiTile label="Gasto atual" value={formatBRL(gastoAtualAbs)} />
        {restante !== null && (
          <KpiTile label="Restante do planejado" value={formatBRL(restante)} tone={restante < 0 ? "warning" : "success"} />
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

      <PlanoMensalSection
        mesReferencia={mesReferencia}
        plano={plano}
        categorias={categorias}
        mesAnterior={mesAnterior}
        planoAnteriorDisponivel={planoAnteriorDisponivel}
      />

      <MetaListScreen metas={metas} categorias={categorias} subcategoriasPorCategoria={subcategoriasPorCategoria} objetivos={objetivos} />
    </div>
  );
}
