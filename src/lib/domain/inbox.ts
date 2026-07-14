/**
 * Tipos de apoio à Caixa de Entrada — não são entidades ENT-* próprias, mas
 * conceitos de triagem descritos em SCR-INBOX-001 (tipos de pendência) e no
 * Agente de Triagem. Ficam separados de src/lib/domain/types.ts para manter
 * aquele arquivo como espelho estrito do dicionário de dados.
 */
import type { DecisaoClassificacao, LancamentoBruto, PropostaClassificacao } from "./types";

export type TipoPendencia =
  | "baixa confiança"
  | "fornecedor desconhecido"
  | "fornecedor ambíguo"
  | "duplicidade"
  | "extraordinário"
  | "contexto necessário"
  | "regra conflitante";

/** Status local de revisão nesta sessão (Etapa 1 — não persiste). */
export type StatusRevisaoLocal = "pendente" | "confirmado" | "corrigido" | "exceção" | "adiado";

export interface ItemFila {
  lancamento: LancamentoBruto;
  proposta: PropostaClassificacao;
  fornecedorNomeOriginal: string;
  tiposPendencia: TipoPendencia[];
  /** Presente só quando algum outro item da fila compartilha fornecedor + proposta — habilita revisão em lote. */
  grupoLoteId?: string;
}

export interface DecisaoLocal {
  status: StatusRevisaoLocal;
  decisao?: DecisaoClassificacao;
}
