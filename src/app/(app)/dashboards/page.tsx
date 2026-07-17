import { createClient } from "@/lib/supabase/server";
import { carregarPainelControle } from "@/lib/dashboards/consulta";
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

function resolverIntervalo(preset: PresetPeriodo, params: SearchParams): { dataInicio: string; dataFim: string } {
  const hoje = new Date();
  const fim = iso(hoje);
  if (preset === "custom" && params.dataInicio && params.dataFim) {
    return { dataInicio: params.dataInicio, dataFim: params.dataFim };
  }
  if (preset === "mes") {
    const [ano, mesNum] = (params.mes || mesAtualIso()).split("-").map(Number);
    const inicio = new Date(ano, mesNum - 1, 1);
    const fimMes = new Date(ano, mesNum, 0); // dia 0 do mês seguinte = último dia do mês atual
    return { dataInicio: iso(inicio), dataFim: iso(fimMes) };
  }
  if (preset === "atual") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { dataInicio: iso(inicio), dataFim: fim };
  }
  const dias = preset === "12m" ? 365 : preset === "6m" ? 180 : 90;
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);
  return { dataInicio: iso(inicio), dataFim: fim };
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
  const { dataInicio, dataFim } = resolverIntervalo(preset, params);
  const objetivoId = params.objetivoId || undefined;
  const mes = params.mes || mesAtualIso();

  const painel = await carregarPainelControle({ dataInicio, dataFim, objetivoId });

  return (
    <DashboardScreen
      painel={painel}
      objetivos={objetivos}
      filtrosAtuais={{ preset, dataInicio, dataFim, mes, objetivoId }}
    />
  );
}
