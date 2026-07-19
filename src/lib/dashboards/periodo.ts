import { formatCompetencia, formatData } from "@/lib/format";
import { mesesAnteriores } from "@/lib/data/competencia";

/**
 * Ajuste (2026-07-19): o período do Painel de Controle filtra por
 * COMPETÊNCIA (`competencia_calculada`), não pela data real de ocorrência —
 * senão uma parcela antiga (comprada em maio, competência de julho) some do
 * filtro "julho" e o total não bate com as telas de Competência/Histórico,
 * que sempre agrupam por competência (premissa #3 da arquitetura). "datas" só
 * existe pro preset "Personalizado", onde o intervalo exato é intencional.
 * Módulo neutro (sem `server-only`) pra ficar testável direto.
 */
export type FiltroPeriodoPainel = { tipo: "competencias"; meses: string[] } | { tipo: "datas"; dataInicio: string; dataFim: string };

function isoDeData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve o período atual + o período anterior de comparação (mesma
 * "duração", imediatamente antes), no mesmo tipo (competências ou datas) do
 * filtro recebido — nunca mistura os dois modos na mesma comparação.
 */
export function resolverPeriodoEAnterior(periodo: FiltroPeriodoPainel): {
  atual: FiltroPeriodoPainel;
  anterior: FiltroPeriodoPainel;
  rotulo: string;
  rotuloAnterior: string;
} {
  if (periodo.tipo === "competencias") {
    const mesesAsc = [...periodo.meses].sort();
    const rotulo =
      mesesAsc.length <= 1 ? formatCompetencia(mesesAsc[0] ?? "") : `${formatCompetencia(mesesAsc[0])} – ${formatCompetencia(mesesAsc[mesesAsc.length - 1])}`;
    const anteriorMeses = mesesAsc.length > 0 ? mesesAnteriores(mesesAsc[0], mesesAsc.length) : [];
    const anteriorAsc = [...anteriorMeses].sort();
    const rotuloAnterior =
      anteriorAsc.length <= 1
        ? formatCompetencia(anteriorAsc[0] ?? "")
        : `${formatCompetencia(anteriorAsc[0])} – ${formatCompetencia(anteriorAsc[anteriorAsc.length - 1])}`;
    return { atual: periodo, anterior: { tipo: "competencias", meses: anteriorMeses }, rotulo, rotuloAnterior };
  }

  const msDia = 86400000;
  const inicioDate = new Date(periodo.dataInicio + "T00:00:00Z");
  const fimDate = new Date(periodo.dataFim + "T00:00:00Z");
  const duracaoDias = Math.max(1, Math.round((fimDate.getTime() - inicioDate.getTime()) / msDia) + 1);
  const anteriorFimDate = new Date(inicioDate.getTime() - msDia);
  const anteriorInicioDate = new Date(anteriorFimDate.getTime() - (duracaoDias - 1) * msDia);
  const anteriorInicio = isoDeData(anteriorInicioDate);
  const anteriorFim = isoDeData(anteriorFimDate);
  return {
    atual: periodo,
    anterior: { tipo: "datas", dataInicio: anteriorInicio, dataFim: anteriorFim },
    rotulo: `${formatData(periodo.dataInicio)} – ${formatData(periodo.dataFim)}`,
    rotuloAnterior: `${formatData(anteriorInicio)} – ${formatData(anteriorFim)}`,
  };
}
