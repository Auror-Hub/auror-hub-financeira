import "server-only";
import { createHash } from "node:crypto";
import Papa from "papaparse";

export interface LinhaCsv {
  numeroLinha: number;
  valores: Record<string, string>;
}

export interface ResultadoParseCsv {
  cabecalhos: string[];
  linhas: LinhaCsv[];
  erros: string[];
}

/** Faz o parse bruto do CSV (texto → linhas com cabeçalho), sem interpretar valores ainda. */
export function parseCsvBruto(conteudo: string, delimitador: string): ResultadoParseCsv {
  const resultado = Papa.parse<Record<string, string>>(conteudo, {
    header: true,
    delimiter: delimitador,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const linhas: LinhaCsv[] = resultado.data.map((valores, i) => ({
    numeroLinha: i + 2, // +1 for header, +1 for 1-based
    valores,
  }));

  const erros = resultado.errors.map((e) => `Linha ${((e.row ?? 0) as number) + 2}: ${e.message}`);

  return { cabecalhos: resultado.meta.fields ?? [], linhas, erros };
}

/**
 * Converte string de valor monetário para centavos inteiros.
 * 'BR' — "1.234,56" (ponto milhar, vírgula decimal). 'US' — "1,234.56".
 * Aceita valores negativos (estornos) e parênteses como negativo — "(50,00)".
 */
export function parseValorMonetario(bruto: string, formato: "BR" | "US"): number | null {
  let texto = bruto.trim();
  if (!texto) return null;

  let negativo = false;
  if (texto.startsWith("(") && texto.endsWith(")")) {
    negativo = true;
    texto = texto.slice(1, -1);
  }
  if (texto.startsWith("-")) {
    negativo = true;
    texto = texto.slice(1);
  }

  texto = texto.replace(/[^\d.,]/g, "");

  let normalizado: string;
  if (formato === "BR") {
    normalizado = texto.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = texto.replace(/,/g, "");
  }

  const numero = Number(normalizado);
  if (Number.isNaN(numero)) return null;

  const centavos = Math.round(numero * 100);
  return negativo ? -centavos : centavos;
}

/**
 * Converte string de data para ISO (AAAA-MM-DD), a partir de um formato
 * declarado no perfil de importação (ex.: "DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY").
 * Para o formato "DD/MM" (sem ano — comum em faturas de cartão), delega para
 * `parseDataSemAno`, que exige uma data de referência.
 */
export function parseDataCsv(bruto: string, formato: string, dataReferenciaIso?: string): string | null {
  const texto = bruto.trim();
  if (!texto) return null;

  if (formato === "DD/MM") {
    return dataReferenciaIso ? parseDataSemAno(texto, dataReferenciaIso) : null;
  }

  const partes = texto.split(/[/\-.]/);
  if (partes.length !== 3) return null;

  const ordem = formato
    .toUpperCase()
    .split(/[/\-.]/)
    .map((p) => p[0]); // ['D','M','Y'] ou ['Y','M','D'] etc.

  const campos: Record<string, string> = {};
  ordem.forEach((letra, i) => {
    campos[letra] = partes[i];
  });

  const ano = campos["Y"]?.padStart(4, "20");
  const mes = campos["M"]?.padStart(2, "0");
  const dia = campos["D"]?.padStart(2, "0");

  if (!ano || !mes || !dia) return null;
  if (Number(mes) < 1 || Number(mes) > 12) return null;
  if (Number(dia) < 1 || Number(dia) > 31) return null;

  return `${ano}-${mes}-${dia}`;
}

/**
 * Infere a data completa (AAAA-MM-DD) a partir de "DD/MM" sem ano, escolhendo
 * o ano que resulta numa data não posterior à data de referência da fatura
 * (o dia de fechamento, por exemplo). Cobre o caso comum de fatura que fecha
 * em janeiro contendo gastos de dezembro do ano anterior — sem isso, um
 * gasto de dezembro ficaria silenciosamente com o ano errado.
 */
export function parseDataSemAno(diaMes: string, dataReferenciaIso: string): string | null {
  const partes = diaMes.trim().split(/[/\-.]/);
  if (partes.length !== 2) return null;
  const dia = partes[0]?.padStart(2, "0");
  const mes = partes[1]?.padStart(2, "0");
  if (!dia || !mes) return null;
  if (Number(mes) < 1 || Number(mes) > 12) return null;
  if (Number(dia) < 1 || Number(dia) > 31) return null;

  const anoReferencia = Number(dataReferenciaIso.slice(0, 4));
  const candidatoMesmoAno = `${anoReferencia}-${mes}-${dia}`;
  const candidatoAnoAnterior = `${anoReferencia - 1}-${mes}-${dia}`;

  // Prefere o mesmo ano da referência se a data não for posterior a ela;
  // comparação lexicográfica é válida porque ambas estão em formato ISO.
  if (candidatoMesmoAno <= dataReferenciaIso) return candidatoMesmoAno;
  return candidatoAnoAnterior;
}

/** Competência = mês de ocorrência do gasto, nunca o vencimento (premissa #3 da arquitetura). */
export function calcularCompetencia(dataIso: string): string {
  return dataIso.slice(0, 7);
}

/** Hash determinístico para deduplicação: mesma data+valor+fornecedor+cartão = provável duplicata. */
export function calcularIdentificadorDeduplicacao(params: {
  data: string;
  valor: number;
  fornecedorOriginal: string;
  cartaoId: string;
}): string {
  const chave = `${params.data}|${params.valor}|${params.fornecedorOriginal.trim().toUpperCase()}|${params.cartaoId}`;
  return createHash("sha256").update(chave).digest("hex");
}

/** Hash do conteúdo do arquivo inteiro — evita reprocessar o mesmo CSV duas vezes. */
export function calcularHashArquivo(conteudo: Buffer): string {
  return createHash("sha256").update(conteudo).digest("hex");
}
