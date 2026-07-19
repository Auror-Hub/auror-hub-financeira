import { createClient } from "@/lib/supabase/server";
import { carregarPainelControle, type FiltroPeriodoPainel } from "@/lib/dashboards/consulta";
import { mesesAnteriores } from "@/lib/data/competencia";
import { DashboardScreen, type PresetPeriodo } from "@/components/domain/dashboards/DashboardScreen";

interface SearchParams {
  preset?: string;
  dataInicio?: string;
  dataFim?: string;
  mes?: string;
  objetivoId?: string;
}

function iso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function mesAtualIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ajuste (2026-07-19): período do Painel de Controle passa a significar
 * "quais competências", não "quais datas de calendário" — uma parcela
 * comprada em maio mas com competência de julho precisa aparecer quando o
 * filtro é "julho" (mesma leitura das telas de Competência/Histórico). Só o
 * preset "Personalizado" continua sendo um intervalo de datas real,
 * explicitamente escolhido pela Victoria.
 */
function resolverPeriodo(preset: PresetPeriodo, params: SearchParams): FiltroPeriodoPainel {
  if (preset === "custom" && params.dataInicio && params.dataFim) {
    return { tipo: "datas", dataInicio: params.dataInicio, dataFim: params.dataFim };
  }
  const mesAtual = mesAtualIso();
  if (preset === "mes") {
    return { tipo: "competencias", meses: [params.mes || mesAtual] };
  }
  if (preset === "atual") {
    return { tipo: "competencias", meses: [mesAtual] };
  }
  const quantidadeMeses = preset === "12m" ? 12 : preset === "6m" ? 6 : 3;
  return { tipo: "competencias", meses: [mesAtual, ...mesesAnteriores(mesAtual, quantidadeMeses - 1)] };
}

const PRESETS_VALIDOS: PresetPeriodo[] = ["atual", "3m", "6m", "12m", "mes", "custom"];

export default async function DashboardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const preset: PresetPeriodo = PRESETS_VALIDOS.includes(params.preset as PresetPeriodo) ? (params.preset as PresetPeriodo) : "3m";
  const periodo = resolverPeriodo(preset, params);
  const objetivoId = params.objetivoId || undefined;
  const mes = params.mes || mesAtualIso();
  // Seeds pros date-pickers do preset "Personalizado" (só usados quando ele é ativado na UI).
  const dataInicio = params.dataInicio || iso(new Date(new Date().setDate(new Date().getDate() - 90)));
  const dataFim = params.dataFim || iso(new Date());

  const painel = await carregarPainelControle({ periodo, objetivoId });

  return (
    <DashboardScreen
      painel={painel}
      objetivos={objetivos}
      filtrosAtuais={{ preset, dataInicio, dataFim, mes, objetivoId }}
    />
  );
}
