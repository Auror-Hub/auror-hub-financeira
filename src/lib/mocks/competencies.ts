/**
 * Detalhe sintético por competência. Números alinhados com src/lib/mocks/home.ts
 * para a competência corrente (mesmo total/pendências), mas cada tela lê seu
 * próprio mock — não há sincronização entre Home/Caixa de Entrada/Competências
 * nesta etapa (dado real e compartilhado chega na Etapa 2).
 */
import type { CompetenciaDetalhe } from "@/lib/domain/competency";
import { COMPETENCIAS, INSIGHTS } from "./dataset";

const DETALHES: Record<string, CompetenciaDetalhe> = {
  "comp-2026-06": {
    competencia: COMPETENCIAS.find((c) => c.id === "comp-2026-06")!,
    documentos: [{ nomeArquivo: "fatura-junho-meridiano.csv", cartaoNome: "Meridiano Roxo", totalDeclarado: 842_355 }],
    totalLancamentos: 63,
    lancamentosRevisados: 54,
    lancamentosPendentes: 9,
    totalConsolidado: 842_355,
    insights: INSIGHTS.filter((i) => i.competenciaId === "comp-2026-06"),
    versoesFechamento: [],
    relatorioDisponivel: false,
  },
  "comp-2026-05": {
    competencia: COMPETENCIAS.find((c) => c.id === "comp-2026-05")!,
    documentos: [{ nomeArquivo: "fatura-maio-meridiano.csv", cartaoNome: "Meridiano Roxo", totalDeclarado: 715_000 }],
    totalLancamentos: 71,
    lancamentosRevisados: 71,
    lancamentosPendentes: 0,
    totalConsolidado: 715_000,
    insights: [],
    versoesFechamento: [{ versao: 1, fechadoEm: "2026-06-01T10:00:00Z" }],
    relatorioDisponivel: true,
  },
  "comp-2026-04": {
    competencia: COMPETENCIAS.find((c) => c.id === "comp-2026-04")!,
    documentos: [{ nomeArquivo: "fatura-abril-litoral.csv", cartaoNome: "Litoral Black", totalDeclarado: 598_000 }],
    totalLancamentos: 58,
    lancamentosRevisados: 58,
    lancamentosPendentes: 0,
    totalConsolidado: 598_000,
    insights: [],
    versoesFechamento: [{ versao: 1, fechadoEm: "2026-05-01T10:00:00Z" }],
    relatorioDisponivel: true,
  },
};

export function getCompetenciaDetalhe(id: string): CompetenciaDetalhe | undefined {
  return DETALHES[id];
}

export function listarCompetencias(): CompetenciaDetalhe[] {
  return COMPETENCIAS.map((c) => DETALHES[c.id]).filter(Boolean);
}
