import "server-only";

/**
 * Auto-detecção de coluna/formato pra reduzir a fricção do mapeamento manual
 * (Insight de Produto, 2026-07-16) — 100% heurística determinística, sem
 * chamada à IA (analisarArquivo é reinvocado a cada troca de aba/linhas-a-
 * pular; uma chamada de IA aí multiplicaria custo/latência numa operação
 * hoje instantânea — mesma cicatriz do timeout de função serverless já visto
 * na classificação em lote, commit d123745).
 *
 * Um campo só é retornado quando a confiança bate o limiar — abaixo disso,
 * fica em branco pro usuário decidir manualmente, nunca um palpite.
 */

export interface CampoDetectado<T = string> {
  valor: T;
  confianca: number;
}

export const LIMIAR_CONFIANCA = 0.6;

const REGEX_MARCAS_DIACRITICAS = new RegExp(String.fromCharCode(91, 0x0300) + "-" + String.fromCharCode(0x036f, 93), "g");

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(REGEX_MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim();
}

const SINONIMOS_DATA = ["data", "date", "dt", "data da transacao", "data de compra", "data lancamento", "data transacao"];
const SINONIMOS_VALOR = ["valor", "montante", "amount", "valor (r$)", "valor r$", "value"];

const REGEX_DATA = /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/;
const REGEX_MONETARIO = /^\(?-?\s*(?:r\$)?\s*-?[\d.,]+\s*\)?$/i;

function scoreNome(cabecalhoNormalizado: string, sinonimos: string[]): number {
  if (sinonimos.some((s) => cabecalhoNormalizado === s)) return 1;
  if (sinonimos.some((s) => cabecalhoNormalizado.includes(s))) return 0.7;
  return 0;
}

function porcentagemQueCasa(valores: string[], regex: RegExp): number {
  const preenchidos = valores.map((v) => v.trim()).filter((v) => v.length > 0);
  if (preenchidos.length === 0) return 0;
  const casam = preenchidos.filter((v) => regex.test(v));
  return casam.length / preenchidos.length;
}

export function detectarColunaData(cabecalhos: string[], amostra: Record<string, string>[]): CampoDetectado | null {
  let melhor: CampoDetectado | null = null;
  for (const cabecalho of cabecalhos) {
    const nomeScore = scoreNome(normalizarTexto(cabecalho), SINONIMOS_DATA);
    const conteudoScore = porcentagemQueCasa(amostra.map((l) => l[cabecalho] ?? ""), REGEX_DATA);
    const confianca = nomeScore * 0.4 + conteudoScore * 0.6;
    if (confianca > 0 && (!melhor || confianca > melhor.confianca)) melhor = { valor: cabecalho, confianca };
  }
  return melhor && melhor.confianca >= LIMIAR_CONFIANCA ? melhor : null;
}

export function detectarColunaValor(
  cabecalhos: string[],
  amostra: Record<string, string>[],
  excluir: Set<string>,
): CampoDetectado | null {
  let melhor: CampoDetectado | null = null;
  for (const cabecalho of cabecalhos) {
    if (excluir.has(cabecalho)) continue;
    const nomeScore = scoreNome(normalizarTexto(cabecalho), SINONIMOS_VALOR);
    const conteudoScore = porcentagemQueCasa(amostra.map((l) => l[cabecalho] ?? ""), REGEX_MONETARIO);
    const confianca = nomeScore * 0.4 + conteudoScore * 0.6;
    if (confianca > 0 && (!melhor || confianca > melhor.confianca)) melhor = { valor: cabecalho, confianca };
  }
  return melhor && melhor.confianca >= LIMIAR_CONFIANCA ? melhor : null;
}

/** Heurística deliberadamente mais fraca que as demais (limiar próprio, mais baixo) — maior comprimento médio + maior cardinalidade, excluindo colunas pouco variadas (status/enum) e as já reivindicadas por outro campo. */
export function detectarColunaDescricao(
  cabecalhos: string[],
  amostra: Record<string, string>[],
  excluir: Set<string>,
): CampoDetectado | null {
  const LIMIAR_DESCRICAO = 0.5;
  let melhor: CampoDetectado | null = null;
  for (const cabecalho of cabecalhos) {
    if (excluir.has(cabecalho)) continue;
    const valores = amostra.map((l) => (l[cabecalho] ?? "").trim()).filter(Boolean);
    if (valores.length === 0) continue;
    const comprimentoMedio = valores.reduce((soma, v) => soma + v.length, 0) / valores.length;
    const cardinalidade = new Set(valores).size / valores.length;
    if (cardinalidade < 0.3) continue; // pouco variado — provavelmente status/enum, não descrição
    const confianca = Math.min(comprimentoMedio / 20, 1) * 0.5 + cardinalidade * 0.5;
    if (!melhor || confianca > melhor.confianca) melhor = { valor: cabecalho, confianca };
  }
  return melhor && melhor.confianca >= LIMIAR_DESCRICAO ? melhor : null;
}

/** Desambigua BR (DD/MM/YYYY) vs US (MM/DD/YYYY) varrendo a amostra por uma linha em que um componente não-ano seja maior que 12 (só pode ser dia). Sem desambiguação, confiança fica abaixo do limiar de uso automático. */
export function detectarFormatoData(amostra: Record<string, string>[], colunaData: string): CampoDetectado<string> | null {
  const valores = amostra.map((l) => (l[colunaData] ?? "").trim()).filter(Boolean);
  if (valores.length === 0) return null;

  let temAnoPrimeiro = false;
  let formatoDesambiguado: string | null = null;

  for (const valor of valores) {
    const partes = valor.split(/[/\-.]/);
    if (partes.length !== 3) continue;
    if (partes[0].length === 4) temAnoPrimeiro = true;
    if (partes[2].length === 4) {
      const primeiro = Number(partes[0]);
      const segundo = Number(partes[1]);
      if (primeiro > 12 && segundo <= 12) formatoDesambiguado = "DD/MM/YYYY";
      else if (segundo > 12 && primeiro <= 12) formatoDesambiguado = "MM/DD/YYYY";
    }
  }

  if (temAnoPrimeiro) return { valor: "YYYY-MM-DD", confianca: 0.9 };
  if (formatoDesambiguado) return { valor: formatoDesambiguado, confianca: 0.85 };
  return null; // tem ano mas nenhuma amostra desambiguou DD/MM vs MM/DD — não arrisca palpite
}

/** BR (vírgula decimal) vs US (ponto decimal) — olha o separador antes dos últimos 2 dígitos em várias linhas da amostra, não só uma. */
export function detectarFormatoMonetario(
  amostra: Record<string, string>[],
  colunaValor: string,
): CampoDetectado<"BR" | "US"> | null {
  const valores = amostra.map((l) => (l[colunaValor] ?? "").trim()).filter(Boolean);
  if (valores.length === 0) return null;

  let votosBR = 0;
  let votosUS = 0;
  for (const valor of valores) {
    const limpo = valor.replace(/[^\d.,]/g, "");
    if (limpo.length < 3) continue;
    const separadorDecimal = limpo[limpo.length - 3];
    if (separadorDecimal === ",") votosBR++;
    else if (separadorDecimal === ".") votosUS++;
  }

  const total = votosBR + votosUS;
  if (total === 0) return null;
  const resultado: CampoDetectado<"BR" | "US"> =
    votosBR >= votosUS ? { valor: "BR", confianca: votosBR / total } : { valor: "US", confianca: votosUS / total };
  return resultado.confianca >= LIMIAR_CONFIANCA ? resultado : null;
}

export interface MapeamentoDetectado {
  colunaData?: CampoDetectado;
  colunaDescricao?: CampoDetectado;
  colunaValor?: CampoDetectado;
  formatoData?: CampoDetectado<string>;
  formatoMonetario?: CampoDetectado<"BR" | "US">;
}

/** Roda todas as detecções em conjunto, já resolvendo qual coluna cada uma reivindica pra não haver conflito entre elas. */
export function detectarMapeamento(cabecalhos: string[], amostra: Record<string, string>[]): MapeamentoDetectado {
  const colunaData = detectarColunaData(cabecalhos, amostra);
  const excluirValor = new Set<string>(colunaData ? [colunaData.valor] : []);
  const colunaValor = detectarColunaValor(cabecalhos, amostra, excluirValor);
  const excluirDescricao = new Set<string>(excluirValor);
  if (colunaValor) excluirDescricao.add(colunaValor.valor);
  const colunaDescricao = detectarColunaDescricao(cabecalhos, amostra, excluirDescricao);
  const formatoData = colunaData ? detectarFormatoData(amostra, colunaData.valor) : null;
  const formatoMonetario = colunaValor ? detectarFormatoMonetario(amostra, colunaValor.valor) : null;

  return {
    ...(colunaData && { colunaData }),
    ...(colunaDescricao && { colunaDescricao }),
    ...(colunaValor && { colunaValor }),
    ...(formatoData && { formatoData }),
    ...(formatoMonetario && { formatoMonetario }),
  };
}

const SINONIMOS_CABECALHO_GERAL = [
  "data",
  "date",
  "valor",
  "montante",
  "amount",
  "value",
  "descricao",
  "lancamento",
  "historico",
  "description",
  "parcela",
  "parcelamento",
  "installment",
  "cartao",
  "card",
  "titularidade",
  "moeda",
  "currency",
];

/**
 * Encontra a linha de cabeçalho real numa planilha que traz linhas de
 * metadado antes da tabela (ex.: fatura "paga" do Itaú — nome, agência,
 * conta, total pago — antes do cabeçalho de verdade). Varre as primeiras
 * linhas da matriz bruta (sem nenhum corte aplicado ainda) procurando a que
 * tem mais células batendo sinônimos de cabeçalho conhecidos; exige pelo
 * menos 2 batidas pra não confundir uma linha de dado qualquer com cabeçalho.
 */
export function detectarLinhaCabecalho(matrizBruta: string[][], maxLinhasVarridas = 30): number | null {
  let melhorLinha: number | null = null;
  let melhorScore = 0;
  const limite = Math.min(matrizBruta.length, maxLinhasVarridas);

  for (let i = 0; i < limite; i++) {
    const celulas = matrizBruta[i].map((c) => normalizarTexto(String(c ?? "")));
    const score = celulas.filter((c) => c && SINONIMOS_CABECALHO_GERAL.some((s) => c === s || c.includes(s))).length;
    if (score > melhorScore) {
      melhorScore = score;
      melhorLinha = i;
    }
  }

  return melhorScore >= 2 ? melhorLinha : null;
}

const REGEX_ESPACO_NAO_QUEBRAVEL = new RegExp(String.fromCharCode(0x00a0), "g");

const SUBSTITUICOES_CONFUSIVEIS: [RegExp, string][] = [
  [/O/g, "0"],
  [/o/g, "0"],
  [/[lI]/g, "1"],
  [/S/g, "5"],
  [REGEX_ESPACO_NAO_QUEBRAVEL, " "],
];

/** Corrige caracteres visualmente confundíveis (ex.: "O" no lugar de "0") — usada só como segunda tentativa quando o parse estrito já falhou, nunca aplicada a texto livre (descrição). */
export function sanitizarCaracteresConfusiveis(texto: string): string {
  let resultado = texto;
  for (const [padrao, substituto] of SUBSTITUICOES_CONFUSIVEIS) {
    resultado = resultado.replace(padrao, substituto);
  }
  return resultado;
}
