import "server-only";
import * as XLSX from "xlsx";
import type { LinhaCsv, ResultadoParseCsv } from "./parse";

/** Lista os nomes das abas de uma planilha, sem interpretar conteúdo. */
export function listarAbas(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { bookSheets: true });
  return workbook.SheetNames;
}

/** Gera rótulo de coluna no estilo Excel (A, B, ..., Z, AA, AB, ...) para cabeçalhos em branco/duplicados. */
function rotuloColuna(indice: number): string {
  let n = indice;
  let rotulo = "";
  do {
    rotulo = String.fromCharCode(65 + (n % 26)) + rotulo;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Coluna ${rotulo}`;
}

/** Lê as primeiras linhas de uma aba sem interpretar cabeçalho nem aplicar corte — usado só pra detectar automaticamente onde a tabela real começa (linhas de metadado antes do cabeçalho, ex.: fatura "paga" do Itaú). */
export function lerMatrizBruta(buffer: Buffer, aba: string, maxLinhas = 30): string[][] {
  const workbook = XLSX.read(buffer, { cellDates: false });
  const sheet = workbook.Sheets[aba];
  if (!sheet) return [];

  const matriz: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 0,
    defval: "",
    raw: false,
  });

  return matriz.slice(0, maxLinhas).map((linha) => linha.map((v) => String(v ?? "")));
}

/**
 * Faz o parse de uma aba específica de um XLSX, pulando N linhas antes do
 * cabeçalho. Cabeçalhos em branco ou duplicados viram "Coluna A/B/C..." para
 * que o mapeamento de colunas continue usável (faturas como a do Porto
 * Seguro têm colunas de data/descrição sem rótulo).
 */
export function parseXlsxBruto(buffer: Buffer, aba: string, linhasParaPular: number): ResultadoParseCsv {
  const workbook = XLSX.read(buffer, { cellDates: false });
  const sheet = workbook.Sheets[aba];
  if (!sheet) return { cabecalhos: [], linhas: [], erros: [`Aba "${aba}" não encontrada.`] };

  const matriz: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: linhasParaPular,
    defval: "",
    raw: false,
  });

  if (matriz.length === 0) return { cabecalhos: [], linhas: [], erros: ["Nenhuma linha encontrada após pular o cabeçalho."] };

  const [linhaCabecalho, ...linhasDados] = matriz;
  const usados = new Set<string>();
  const cabecalhos = linhaCabecalho.map((valor, i) => {
    const texto = String(valor ?? "").trim();
    if (!texto || usados.has(texto)) {
      const fallback = rotuloColuna(i);
      usados.add(fallback);
      return fallback;
    }
    usados.add(texto);
    return texto;
  });

  const linhas: LinhaCsv[] = linhasDados
    .filter((linha) => linha.some((v) => String(v ?? "").trim() !== ""))
    .map((linha, i) => {
      const valores: Record<string, string> = {};
      cabecalhos.forEach((cab, c) => {
        valores[cab] = String(linha[c] ?? "").trim();
      });
      return { numeroLinha: linhasParaPular + 2 + i, valores };
    });

  return { cabecalhos, linhas, erros: [] };
}
