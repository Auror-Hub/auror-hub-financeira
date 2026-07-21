import { createClient } from "@/lib/supabase/server";
import { carregarPainelControle, type FiltroPeriodoPainel } from "@/lib/dashboards/consulta";
import { montarMatrizControle } from "@/lib/dashboards/matriz";
import { priorizarSinais } from "@/lib/dashboards/sinais";
import { carregarPlanoMensal } from "@/lib/plano/consulta";
import { calcularProjecao } from "@/lib/metas/projecao";
import { diasDecorridosNoMes, mesesAnteriores } from "@/lib/data/competencia";
import { carregarCompetencias, carregarUltimaAtualizacaoCompetencia } from "@/lib/competencias/consulta";
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
 * explicitamente escolhido pela Victoria (ADR-009: essa é a única lente por
 * ocorrência real no Explorar, sempre declarada na UI — ver rótulo abaixo).
 */
function resolverPeriodo(preset: PresetPeriodo, params: SearchParams, mesUltimoFechado: string | null): FiltroPeriodoPainel {
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
  if (preset === "fechado") {
    // Sem nenhuma competência fechada ainda (uso muito recente) — cai pro mês atual.
    return { tipo: "competencias", meses: [mesUltimoFechado ?? mesAtual] };
  }
  const quantidadeMeses = preset === "12m" ? 12 : preset === "6m" ? 6 : 3;
  return { tipo: "competencias", meses: [mesAtual, ...mesesAnteriores(mesAtual, quantidadeMeses - 1)] };
}

const PRESETS_VALIDOS: PresetPeriodo[] = ["fechado", "atual", "3m", "6m", "12m", "mes", "custom"];

export default async function DashboardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const competencias = await carregarCompetencias();
  const ultimoFechado = competencias.find((c) => c.competencia.estado === "fechada" || c.competencia.estado === "reaberta");
  const mesUltimoFechado = ultimoFechado?.competencia.mesReferencia ?? null;

  const preset: PresetPeriodo = PRESETS_VALIDOS.includes(params.preset as PresetPeriodo) ? (params.preset as PresetPeriodo) : "fechado";
  const periodo = resolverPeriodo(preset, params, mesUltimoFechado);
  const objetivoId = params.objetivoId || undefined;
  const mes = params.mes || mesAtualIso();
  // Seeds pros date-pickers do preset "Personalizado" (só usados quando ele é ativado na UI).
  const dataInicio = params.dataInicio || iso(new Date(new Date().setDate(new Date().getDate() - 90)));
  const dataFim = params.dataFim || iso(new Date());

  const painel = await carregarPainelControle({ periodo, objetivoId });

  // Frescor (Fase 5, Auditoria V2) só faz sentido quando o período resolve a
  // exatamente uma competência — períodos multi-mês/datas não têm um único
  // "estado" pra declarar.
  let competenciaUnica: { estado: (typeof competencias)[number]["competencia"]["estado"]; ultimaAtualizacao: string | null } | null = null;
  if (periodo.tipo === "competencias" && periodo.meses.length === 1) {
    const mesUnico = periodo.meses[0];
    const detalhe = competencias.find((c) => c.competencia.mesReferencia === mesUnico);
    if (detalhe) {
      competenciaUnica = {
        estado: detalhe.competencia.estado,
        ultimaAtualizacao: await carregarUltimaAtualizacaoCompetencia(mesUnico),
      };
    }
  }

  // Fase 9 (Auditoria V2): "Painel do mês" é sempre ancorado a UM mês — o mais
  // recente dentro do período selecionado (ou o mês corrente, quando o período
  // é "Personalizado" por datas) — independente do range multi-mês que
  // Composição/Evolução podem estar mostrando.
  const mesFoco = periodo.tipo === "competencias" ? periodo.meses[0] : mesAtualIso();
  const [mesAnt1, mesAnt2] = mesesAnteriores(mesFoco, 2);

  async function carregarMatrizDoMes(mes: string) {
    const [painelMes, plano] = await Promise.all([
      carregarPainelControle({ periodo: { tipo: "competencias", meses: [mes] }, objetivoId }),
      carregarPlanoMensal(mes),
    ]);
    return { painelMes, plano, matriz: montarMatrizControle(painelMes, plano) };
  }

  const [dadosMesFoco, dadosAnt1, dadosAnt2] = await Promise.all([
    carregarMatrizDoMes(mesFoco),
    carregarMatrizDoMes(mesAnt1),
    carregarMatrizDoMes(mesAnt2),
  ]);

  const recorrenciaMesesAnteriores = new Map<string, number>();
  for (const dados of [dadosAnt1, dadosAnt2]) {
    for (const linha of dados.matriz) {
      if (linha.situacao === "atencao" || linha.situacao === "excedido") {
        recorrenciaMesesAnteriores.set(linha.categoriaId, (recorrenciaMesesAnteriores.get(linha.categoriaId) ?? 0) + 1);
      }
    }
  }
  const sinais = priorizarSinais(dadosMesFoco.matriz, recorrenciaMesesAnteriores);

  const diasMesFoco = diasDecorridosNoMes(mesFoco, new Date());
  const projecao = diasMesFoco ? calcularProjecao(dadosMesFoco.painelMes.total, diasMesFoco.decorridos, diasMesFoco.total) : null;

  const competenciaFoco = competencias.find((c) => c.competencia.mesReferencia === mesFoco);
  const coberturaRevisao =
    competenciaFoco && competenciaFoco.totalLancamentos > 0
      ? (competenciaFoco.totalLancamentos - competenciaFoco.lancamentosPendentes) / competenciaFoco.totalLancamentos
      : null;

  return (
    <DashboardScreen
      painel={painel}
      objetivos={objetivos}
      filtrosAtuais={{ preset, dataInicio, dataFim, mes, objetivoId }}
      competenciaUnica={competenciaUnica}
      mesFoco={mesFoco}
      painelMesFoco={dadosMesFoco.painelMes}
      plano={dadosMesFoco.plano}
      matriz={dadosMesFoco.matriz}
      sinais={sinais}
      mesAnteriorTotal={dadosAnt1.painelMes.total}
      projecao={projecao}
      coberturaRevisao={coberturaRevisao}
    />
  );
}
