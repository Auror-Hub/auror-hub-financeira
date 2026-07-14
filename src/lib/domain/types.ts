/**
 * Tipos do domínio da Hub Financeira.
 *
 * Espelham fielmente as entidades congeladas no dicionário de dados da
 * arquitetura (docs/architecture, seção 8) e no blueprint (seção 5). Este
 * arquivo é o "contrato" que a Etapa 2 (Backend/Supabase) deverá satisfazer
 * com dados reais — ver docs/CONSTRUCTION-PLAN.md.
 *
 * Convenções:
 * - Nomes de campo em camelCase, preservando o termo em português do
 *   dicionário (ex.: `fornecedorOriginal` ↔ `fornecedor_original`).
 * - Valores de enum mantidos exatamente como no dicionário, inclusive acentos.
 * - Valor monetário representado em CENTAVOS inteiros (`Centavos`), não float,
 *   para evitar erro de ponto flutuante em dinheiro. Formatação para BRL
 *   acontece só na exibição (ver src/lib/format.ts).
 * - Datas como string ISO (`YYYY-MM-DD`) ou ano-mês (`YYYY-MM`) — o backend
 *   define o tipo real na Etapa 2; aqui basta uma representação estável.
 */

/** Valor monetário em centavos inteiros. R$ 12,34 => 1234. */
export type Centavos = number;

/** Data ISO `YYYY-MM-DD`. */
export type DataISO = string;

/** Ano-mês `YYYY-MM` (competência é referenciada por mês). */
export type AnoMes = string;

/** Timestamp ISO 8601. */
export type DataHoraISO = string;

// ---------------------------------------------------------------------------
// ENT-CARD — cartão / origem financeira
// ---------------------------------------------------------------------------
export interface Cartao {
  id: string;
  instituicao: string;
  apelido?: string;
  ultimos4Digitos?: string;
  ativo: boolean;
}

// ---------------------------------------------------------------------------
// ENT-COMPETENCY — período financeiro consolidado
// ---------------------------------------------------------------------------
export type EstadoCompetencia =
  | "aguardando documentos"
  | "importando"
  | "divergência"
  | "em revisão"
  | "pronta"
  | "fechada"
  | "reaberta"
  | "atualizada";

export interface Competencia {
  id: string;
  mesReferencia: AnoMes;
  estado: EstadoCompetencia;
}

// ---------------------------------------------------------------------------
// ENT-TAXONOMY-TERM — vocabulário controlado
// ---------------------------------------------------------------------------
export type DimensaoTaxonomia =
  | "categoria"
  | "subcategoria"
  | "objetivo"
  | "natureza"
  | "essencialidade"
  | "tipo_de_ocorrência";

export type StatusTermo = "ativo" | "desativado" | "proposto";

export type OrigemTermo = "padrão do sistema" | "criado pelo usuário" | "sugerido pela IA";

export interface TermoTaxonomia {
  id: string;
  dimensao: DimensaoTaxonomia;
  termoPaiId?: string;
  rotulo: string;
  status: StatusTermo;
  origem: OrigemTermo;
}

// ---------------------------------------------------------------------------
// ENT-STANDARD-MERCHANT — fornecedor padronizado
// ---------------------------------------------------------------------------
export interface FornecedorPadronizado {
  id: string;
  nomeOficial: string;
  essencialidadePadraoId?: string;
  categoriaDominanteId?: string;
  confianca: number;
  /** true = não força categoria única (comportamento contextual). */
  comportamentoContextual: boolean;
  primeiraOcorrencia?: DataISO;
  ultimaOcorrencia?: DataISO;
  valorMin?: Centavos;
  valorMax?: Centavos;
  valorMedio?: Centavos;
}

// ---------------------------------------------------------------------------
// ENT-RAW-TRANSACTION — lançamento bruto (imutável, RUL-1)
// ---------------------------------------------------------------------------
export interface LancamentoBruto {
  id: string;
  loteImportacaoId: string;
  cartaoId: string;
  /**
   * Mês de ocorrência do gasto (AAAA-MM), não o vencimento da fatura
   * (premissa #3 da Arquitetura Completa). Corrigido em BE-2: era
   * `competenciaCalculadaId` (sugeria FK) na FE-2 — a tabela `competencias`
   * real só existe a partir de BE-5, então isto é texto, não referência.
   */
  competenciaCalculada: AnoMes;
  data: DataISO;
  vencimento?: DataISO;
  fornecedorOriginal: string;
  descricaoOriginal: string;
  valor: Centavos;
  parcelaAtual?: number;
  totalParcelas?: number;
  moeda: string;
  arquivoOrigemId: string;
  paginaOuPosicao?: string;
  identificadorDeduplicacao: string;
}

// ---------------------------------------------------------------------------
// ENT-SOURCE-DOCUMENT, ENT-IMPORT-BATCH, ENT-IMPORT-EVENT,
// ENT-POSSIBLE-DUPLICATE, ENT-IMPORT-PROFILE — domínio bruto (BE-2, ADR-002)
// ---------------------------------------------------------------------------
export type StatusProcessamentoDocumento =
  | "recebido"
  | "reconhecendo"
  | "extraindo"
  | "conciliando"
  | "concluido"
  | "divergencia"
  | "falhou";

export interface DocumentoOrigem {
  id: string;
  perfilId: string;
  cartaoId: string;
  nomeArquivo: string;
  hash: string;
  periodo?: { inicio?: DataISO; fim?: DataISO };
  vencimento?: DataISO;
  totalDeclarado?: Centavos;
  dataEnvio: DataHoraISO;
  statusProcessamento: StatusProcessamentoDocumento;
  storagePath: string;
  versaoImportador: string;
}

export interface LoteImportacao {
  id: string;
  documentoId: string;
  iniciadoEm: DataHoraISO;
  concluidoEm?: DataHoraISO;
  status: "reconhecendo" | "extraindo" | "conciliando" | "concluido" | "falhou";
  quantidadeExtraida: number;
  totalExtraido: Centavos;
  divergencia: Centavos;
  versaoProcesso: string;
}

export interface EventoImportacao {
  id: string;
  loteId: string;
  tipo: "reconhecimento" | "extracao" | "divergencia" | "duplicidade" | "linha_invalida" | "erro";
  detalhe?: string;
  criadoEm: DataHoraISO;
}

export interface PossivelDuplicata {
  id: string;
  lancamentoAId: string;
  lancamentoBId: string;
  motivo: string;
  status: "pendente" | "confirmado_duplicado" | "confirmado_distinto";
  criadoEm: DataHoraISO;
}

/**
 * ENT-IMPORT-PROFILE (ADR-002) — mapeamento de colunas reutilizável por cartão.
 * `modoValor='credito_debito'` cobre faturas com colunas separadas de
 * crédito/débito (ex.: Porto Seguro) em vez de uma única coluna com sinal.
 */
export interface PerfilImportacao {
  id: string;
  perfilId: string;
  cartaoId: string;
  instituicao: string;
  versaoFormato?: string;
  tipoArquivo: "csv" | "xlsx";
  aba?: string;
  linhasParaPular: number;
  delimitador: string;
  codificacao: string;
  formatoData: string;
  formatoMonetario: "BR" | "US";
  colunaData: string;
  colunaDescricao: string;
  modoValor: "unica" | "credito_debito";
  colunaValor?: string;
  colunaCredito?: string;
  colunaDebito?: string;
  colunaParcela?: string;
  colunaMoeda?: string;
  transformacoes?: Record<string, unknown>;
  ultimaUtilizacao?: DataHoraISO;
  criadoEm: DataHoraISO;
}

// ---------------------------------------------------------------------------
// ENT-CLASSIFICATION-PROPOSAL — proposta de classificação da IA (imutável)
// ---------------------------------------------------------------------------

/** As seis dimensões estruturadas de classificação (D7: confiança por dimensão). */
export type DimensaoClassificavel =
  | "categoria"
  | "subcategoria"
  | "objetivo"
  | "natureza"
  | "essencialidade"
  | "tipoOcorrencia";

/** Referência a termo de taxonomia por dimensão (todas opcionais). */
export type DimensoesClassificacao = Partial<Record<DimensaoClassificavel, string>>;

export interface PropostaClassificacao {
  id: string;
  lancamentoId: string;
  fornecedorSugeridoId?: string;
  dimensoes: DimensoesClassificacao;
  contextoSugerido?: { tagId?: string; texto?: string };
  confiancaGeral: number;
  /** D7 — confiança por dimensão (0–1). */
  confiancaPorDimensao: Partial<Record<DimensaoClassificavel, number>>;
  /** D11 — nunca opcional. */
  justificativa: string;
  regrasUtilizadasIds?: string[];
  exemplosSemelhantesIds?: string[];
  versaoClassificador: string;
  criadoEm: DataHoraISO;
}

// ---------------------------------------------------------------------------
// ENT-CLASSIFICATION-DECISION — decisão humana (append-only, versionada)
// ---------------------------------------------------------------------------
export type OrigemDecisao = "manual" | "confirmação de sugestão" | "regra automática";

export type StatusDecisao =
  | "confirmada"
  | "corrigida"
  | "parcialmente corrigida"
  | "exceção"
  | "substituída";

export interface DecisaoClassificacao {
  id: string;
  lancamentoId: string;
  propostaAnteriorId?: string;
  classificacaoConfirmada: DimensoesClassificacao & { fornecedorId?: string };
  usuarioResponsavelId?: string;
  origemDaDecisao: OrigemDecisao;
  status: StatusDecisao;
  versao: number;
  data: DataHoraISO;
}

// ---------------------------------------------------------------------------
// ENT-METRIC — métrica analítica
// ---------------------------------------------------------------------------
export interface Metrica {
  id: string;
  snapshotId: string;
  tipo: string;
  dimensaoRefId?: string;
  valor: number;
}

// ---------------------------------------------------------------------------
// ENT-INSIGHT — insight analítico
// ---------------------------------------------------------------------------
export type StatusInsight = "ativo" | "descartado" | "superseded";

export interface Insight {
  id: string;
  competenciaId: string;
  tipo: string;
  titulo: string;
  explicacao: string;
  relevancia: number;
  confianca: number;
  impacto: number;
  status: StatusInsight;
  versaoMotorAnalitico: string;
}

// ---------------------------------------------------------------------------
// ENT-RECOMMENDATION — recomendação
// ---------------------------------------------------------------------------
export type TipoRecomendacao = "economia" | "atenção" | "observação futura";

export interface Recomendacao {
  id: string;
  insightRelacionadoId: string;
  texto: string;
  tipo: TipoRecomendacao;
}
