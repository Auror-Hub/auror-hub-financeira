/**
 * Dados sintéticos da Etapa 1 (Frontend).
 *
 * NADA aqui corresponde a dados financeiros reais de Victoria ou de terceiros
 * — nomes de fornecedor, valores, pessoas e datas são fictícios, criados só
 * para exercitar a interface. Ver docs/development/SECURITY-AND-DATA.md.
 *
 * Estes registros são substituídos por dados reais do Supabase na Etapa 2.
 * Enquanto isso, servem de "fixture" tipada contra src/lib/domain/types.ts.
 */
import type {
  Cartao,
  Competencia,
  Insight,
  Recomendacao,
} from "@/lib/domain/types";

export const CARTOES: Cartao[] = [
  { id: "card-1", instituicao: "Banco Meridiano", apelido: "Meridiano Roxo", ultimos4Digitos: "4417", ativo: true },
  { id: "card-2", instituicao: "Banco Litoral", apelido: "Litoral Black", ultimos4Digitos: "9032", ativo: true },
];

export const COMPETENCIAS: Competencia[] = [
  { id: "comp-2026-06", mesReferencia: "2026-06", estado: "em revisão" },
  { id: "comp-2026-05", mesReferencia: "2026-05", estado: "fechada" },
  { id: "comp-2026-04", mesReferencia: "2026-04", estado: "fechada" },
];

export const COMPETENCIA_ATUAL_ID = "comp-2026-06";

export const INSIGHTS: Insight[] = [
  {
    id: "insight-1",
    competenciaId: "comp-2026-06",
    tipo: "variação-concentrada",
    titulo: "Alta de gastos concentrada em duas despesas de saúde",
    explicacao:
      "Os gastos subiram 17% frente à média dos últimos três meses, mas 74% dessa alta vem de dois procedimentos odontológicos pontuais — o restante do mês ficou dentro do padrão.",
    relevancia: 0.9,
    confianca: 0.82,
    impacto: 0.7,
    status: "ativo",
    versaoMotorAnalitico: "analista-v0-mock",
  },
  {
    id: "insight-2",
    competenciaId: "comp-2026-06",
    tipo: "recorrência-nova",
    titulo: "Nova assinatura recorrente detectada",
    explicacao:
      "Uma cobrança de streaming passou a aparecer todo mês desde abril. Ainda é pequena, mas é um compromisso fixo novo que não existia no início do ano.",
    relevancia: 0.55,
    confianca: 0.68,
    impacto: 0.3,
    status: "ativo",
    versaoMotorAnalitico: "analista-v0-mock",
  },
];

export const RECOMENDACOES: Recomendacao[] = [
  {
    id: "rec-1",
    insightRelacionadoId: "insight-1",
    texto:
      "Os gastos extraordinários de saúde tendem a não se repetir no próximo mês — vale reavaliar o orçamento de junho sem contá-los como base.",
    tipo: "observação futura",
  },
  {
    id: "rec-2",
    insightRelacionadoId: "insight-2",
    texto:
      "Revise se a nova assinatura de streaming ainda faz sentido; foram três cobranças seguidas sem uso registrado.",
    tipo: "economia",
  },
];
