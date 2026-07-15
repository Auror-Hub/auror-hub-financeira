/**
 * Tipos de apoio ao ciclo de vida de competência (SCR-COMP-*) — não são
 * entidades ENT-* próprias em si, mas o view-model de detalhe descrito na
 * arquitetura (documentos associados, lotes, contagens, versões de
 * fechamento). Ficam fora de src/lib/domain/types.ts pelo mesmo motivo de
 * src/lib/domain/inbox.ts.
 */
import type { Centavos, Competencia, Insight, Recomendacao } from "./types";

export interface DocumentoOrigemResumo {
  nomeArquivo: string;
  cartaoNome: string;
  totalDeclarado: Centavos;
}

export interface VersaoFechamento {
  versao: number;
  motivoReaberturaAnterior?: string;
  fechadoEm: string;
}

export interface CompetenciaDetalhe {
  competencia: Competencia;
  documentos: DocumentoOrigemResumo[];
  totalLancamentos: number;
  lancamentosRevisados: number;
  lancamentosPendentes: number;
  totalConsolidado: Centavos;
  insights: Insight[];
  recomendacoes: Recomendacao[];
  versoesFechamento: VersaoFechamento[];
  relatorioDisponivel: boolean;
}

export const MOTIVOS_REABERTURA = ["Novo documento", "Correção", "Outro"] as const;
export type MotivoReabertura = (typeof MOTIVOS_REABERTURA)[number];
