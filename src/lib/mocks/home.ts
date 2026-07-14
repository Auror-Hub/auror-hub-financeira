/**
 * View model da Home (SCR-HOME-001), montado a partir dos dados sintéticos.
 *
 * A Home é síntese interpretativa — prioriza frases explicativas sobre números
 * soltos (blueprint 4.1). Este montador reúne o que a tela precisa; na Etapa 2
 * ele será substituído por leitura real do acervo consolidado.
 */
import type { Centavos, Competencia, Insight, Recomendacao } from "@/lib/domain/types";
import {
  COMPETENCIAS,
  COMPETENCIA_ATUAL_ID,
  INSIGHTS,
  RECOMENDACOES,
} from "./dataset";

export interface DespesaExtraordinaria {
  descricao: string;
  fornecedor: string;
  valor: Centavos;
}

export interface CategoriaPressionada {
  rotulo: string;
  variacao: number;
}

export interface AlertaHome {
  tom: "atenção" | "risco";
  texto: string;
}

export interface RelatorioResumo {
  competenciaLabel: string;
  disponivel: boolean;
}

export interface HomeResumo {
  competencia: Competencia;
  totalAnalisado: Centavos;
  quantidadeLancamentos: number;
  itensAguardandoRevisao: number;
  /** Fração: 0.17 = +17% vs. média histórica. */
  variacaoVsMedia: number;
  /** Frase interpretativa principal, exibida em destaque. */
  narrativaPrincipal: string;
  principaisMudancas: Insight[];
  despesasExtraordinarias: DespesaExtraordinaria[];
  categoriasPressionadas: CategoriaPressionada[];
  alertas: AlertaHome[];
  recomendacoes: Recomendacao[];
  ultimoRelatorio?: RelatorioResumo;
}

export function getHomeResumo(): HomeResumo {
  const competencia = COMPETENCIAS.find((c) => c.id === COMPETENCIA_ATUAL_ID)!;

  return {
    competencia,
    totalAnalisado: 842_355,
    quantidadeLancamentos: 63,
    itensAguardandoRevisao: 9,
    variacaoVsMedia: 0.17,
    narrativaPrincipal:
      "Os gastos de junho ficaram 17% acima da média dos últimos três meses, mas quase três quartos dessa diferença vêm de duas despesas de saúde pontuais. Fora isso, o mês seguiu dentro do seu padrão.",
    principaisMudancas: INSIGHTS.filter((i) => i.competenciaId === competencia.id && i.status === "ativo"),
    despesasExtraordinarias: [
      { descricao: "Tratamento odontológico (2 de 2)", fornecedor: "Clínica Sorriso Claro", valor: 185_000 },
      { descricao: "Consulta especializada", fornecedor: "Clínica Sorriso Claro", valor: 62_000 },
    ],
    categoriasPressionadas: [
      { rotulo: "Saúde", variacao: 1.4 },
      { rotulo: "Alimentação", variacao: 0.12 },
    ],
    alertas: [
      { tom: "atenção", texto: "9 lançamentos ainda aguardam sua revisão nesta competência." },
      { tom: "atenção", texto: "Uma nova assinatura recorrente foi detectada e ainda não foi confirmada." },
    ],
    recomendacoes: RECOMENDACOES,
    ultimoRelatorio: { competenciaLabel: "Maio de 2026", disponivel: true },
  };
}
