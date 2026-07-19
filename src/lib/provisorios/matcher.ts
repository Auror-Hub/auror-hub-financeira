/**
 * Rearquitetura (Fase 3, ADR-007): matcher de conciliação — puro, sem I/O.
 * Pontua candidatos (lançamentos reais) contra um provisório combinando
 * diferença de valor + proximidade de data + similaridade de fornecedor
 * (heurística de primeiro corte, mesmo espírito de outros limiares
 * documentados no projeto — ex. MULTIPLICADOR_DESPESA_EXTRAORDINARIA).
 * Nunca concilia automaticamente — só ranqueia; a confirmação é sempre uma
 * ação humana explícita (mesmo espírito de `possiveis_duplicatas`).
 */

export interface ProvisorioParaMatch {
  dataOcorrencia: string; // AAAA-MM-DD
  valor: number; // centavos, mesmo sinal de lancamentos_brutos.valor
  fornecedorDica: string | null;
}

export interface CandidatoLancamento {
  id: string;
  data: string; // AAAA-MM-DD
  valor: number;
  fornecedorOriginal: string;
}

export interface CandidatoRankeado {
  id: string;
  score: number;
}

const PISO_SCORE = 10;
const PONTOS_VALOR_EXATO = 40;
const PONTOS_VALOR_PROXIMO = 25;
const PONTOS_VALOR_PARECIDO = 10;
const PONTOS_DATA_EXATA = 40;
const PONTOS_DATA_PROXIMA = 25;
const PONTOS_DATA_PARECIDA = 10;
const PONTOS_FORNECEDOR = 20;

function normalizar(texto: string): string {
  return texto.trim().toUpperCase();
}

function pontuarValor(valorProvisorio: number, valorCandidato: number): number {
  if (Math.sign(valorProvisorio) !== Math.sign(valorCandidato)) return 0;
  const a = Math.abs(valorProvisorio);
  const b = Math.abs(valorCandidato);
  if (a === 0 || b === 0) return 0;
  const diferencaRelativa = Math.abs(a - b) / Math.max(a, b);
  if (diferencaRelativa === 0) return PONTOS_VALOR_EXATO;
  if (diferencaRelativa <= 0.05) return PONTOS_VALOR_PROXIMO;
  if (diferencaRelativa <= 0.15) return PONTOS_VALOR_PARECIDO;
  return 0;
}

function pontuarData(dataProvisorio: string, dataCandidato: string): number {
  const dias = Math.abs((new Date(dataCandidato + "T00:00:00Z").getTime() - new Date(dataProvisorio + "T00:00:00Z").getTime()) / 86400000);
  if (dias === 0) return PONTOS_DATA_EXATA;
  if (dias <= 2) return PONTOS_DATA_PROXIMA;
  if (dias <= 7) return PONTOS_DATA_PARECIDA;
  return 0;
}

function pontuarFornecedor(fornecedorDica: string | null, fornecedorOriginal: string): number {
  if (!fornecedorDica) return 0;
  const dica = normalizar(fornecedorDica);
  const original = normalizar(fornecedorOriginal);
  if (!dica || !original) return 0;
  return original.includes(dica) || dica.includes(original) ? PONTOS_FORNECEDOR : 0;
}

/** Score 0-100. Nunca decide conciliação por conta própria — só informa a ordem de exibição. */
export function pontuarCandidato(provisorio: ProvisorioParaMatch, candidato: CandidatoLancamento): number {
  return (
    pontuarValor(provisorio.valor, candidato.valor) +
    pontuarData(provisorio.dataOcorrencia, candidato.data) +
    pontuarFornecedor(provisorio.fornecedorDica, candidato.fornecedorOriginal)
  );
}

/** Ordena candidatos por score desc, descarta os abaixo do piso (ruído), limita a `maximo`. */
export function rankearCandidatos(provisorio: ProvisorioParaMatch, candidatos: CandidatoLancamento[], maximo = 5): CandidatoRankeado[] {
  return candidatos
    .map((c) => ({ id: c.id, score: pontuarCandidato(provisorio, c) }))
    .filter((c) => c.score >= PISO_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, maximo);
}
