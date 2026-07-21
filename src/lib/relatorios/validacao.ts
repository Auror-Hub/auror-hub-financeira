export const PADRAO_VALOR_MONETARIO = /-?R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;
export const PADRAO_PERCENTUAL = /-?\d+(?:[.,]\d+)?%/g;

/** Extrai todo valor monetário/percentual literal já presente num texto — usado pra tratar números que já vêm de fatos existentes (insights/recomendações) como "conhecidos", nunca como invenção do narrador. */
export function extrairValoresCitados(texto: string): string[] {
  return [...(texto.match(PADRAO_VALOR_MONETARIO) ?? []), ...(texto.match(PADRAO_PERCENTUAL) ?? [])];
}

export interface ResultadoValidacaoRelatorio {
  valido: boolean;
  avisos: string[];
}

/**
 * Normaliza pra comparação: remove o sinal de negativo ("gastei R$ 50,00" e
 * "-R$ 50,00" descrevem o mesmo fato — o narrador pode preferir uma forma ou
 * outra dependendo da frase) e remove todo espaço em branco, inclusive o
 * espaço não-quebrável (U+00A0) que `Intl.NumberFormat` usa entre "R$" e o
 * número — a API às vezes reproduz esse valor com espaço comum, o que faria
 * uma comparação de string ingênua discordar de dois valores idênticos.
 */
function normalizarValor(valor: string): string {
  return valor.trim().replace(/^-/, "").replace(/\s+/g, "");
}

/**
 * Fase 10 (Auditoria V2): checagem best-effort por string-matching — nunca
 * perfeita (não pega números escritos por extenso, nem contagens simples
 * como "6 lançamentos"), mas pega o caso grave de valor monetário ou
 * percentual inventado. Todo R$/% citado no texto precisa aparecer
 * (a menos do sinal) entre os valores conhecidos (as strings já formatadas
 * que foram de fato enviadas no pacote de dados do prompt).
 */
export function validarRelatorio(textoGerado: string, valoresConhecidos: string[]): ResultadoValidacaoRelatorio {
  const conhecidos = new Set(valoresConhecidos.map(normalizarValor));
  const citados = [...(textoGerado.match(PADRAO_VALOR_MONETARIO) ?? []), ...(textoGerado.match(PADRAO_PERCENTUAL) ?? [])];

  const avisos: string[] = [];
  for (const valor of citados) {
    if (!conhecidos.has(normalizarValor(valor))) {
      avisos.push(`Valor "${valor.trim()}" citado no relatório não foi encontrado no pacote de dados enviado.`);
    }
  }

  return { valido: avisos.length === 0, avisos };
}
