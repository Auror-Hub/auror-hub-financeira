import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { formatBRL, formatCompetencia, formatData } from "@/lib/format";
import type { IntencaoEstruturada } from "./interpretar";
import type { DadosRecuperados, DadosResumoInsights } from "./recuperar";

export interface ItemComLink {
  texto: string;
  href?: string;
}

export interface RespostaConsultor {
  respostaDireta: string;
  evidencias: ItemComLink[];
  interpretacao: string;
  ressalvas: string;
  acoesPossiveis: ItemComLink[];
  aprofundamento: string;
}

const MARCADORES = ["RESPOSTA_DIRETA", "EVIDENCIAS", "INTERPRETACAO", "RESSALVAS", "ACOES_POSSIVEIS", "APROFUNDAMENTO"] as const;

function linkEvidenciaDeDados(dados: DadosRecuperados): ItemComLink | null {
  switch (dados.tipo) {
    case "resumo_relatorio":
      return { texto: "Ver relatório completo", href: `/relatorios/${dados.versaoId}` };
    case "resumo_insights_competencia":
      return { texto: "Ver competência completa", href: `/competencias/${dados.competenciaId}` };
    case "total_categoria_periodo":
      return { texto: "Ver no Dashboard", href: `/dashboards?dataInicio=${dados.dataInicio}&dataFim=${dados.dataFim}` };
    case "maiores_despesas":
      return { texto: "Ver no Histórico", href: `/historico?dataInicio=${dados.dataInicio}&dataFim=${dados.dataFim}` };
    default:
      return null;
  }
}

function montarTextoDados(dados: DadosRecuperados): string {
  switch (dados.tipo) {
    case "total_categoria_periodo":
      return `Categoria: ${dados.categoriaRotulo}
Período: ${formatData(dados.dataInicio)} a ${formatData(dados.dataFim)}
Total gasto: ${formatBRL(dados.totalCentavos)}
Quantidade de lançamentos: ${dados.totalLancamentos}`;

    case "comparacao_periodos":
      return `Categoria: ${dados.categoriaRotulo ?? "todas (total geral)"}
Período A: ${formatData(dados.periodoA.inicio)} a ${formatData(dados.periodoA.fim)} — total ${formatBRL(dados.periodoA.totalCentavos)} (${dados.periodoA.totalLancamentos} lançamentos)
Período B: ${formatData(dados.periodoB.inicio)} a ${formatData(dados.periodoB.fim)} — total ${formatBRL(dados.periodoB.totalCentavos)} (${dados.periodoB.totalLancamentos} lançamentos)`;

    case "maiores_despesas":
      return `Período: ${formatData(dados.dataInicio)} a ${formatData(dados.dataFim)}
Maiores despesas (${dados.despesas.length}):
${dados.despesas.length ? dados.despesas.map((d) => `- ${d.fornecedor}: ${formatBRL(d.valorCentavos)} em ${formatData(d.data)} (categoria: ${d.categoriaRotulo ?? "sem categoria decidida"})`).join("\n") : "Nenhum lançamento encontrado nesse período."}`;

    case "resumo_insights_competencia":
      return `Competência: ${formatCompetencia(dados.mesReferencia)}
Insights (${dados.insights.length}):
${dados.insights.length ? dados.insights.map((i) => `- [${i.tipo}] ${i.titulo}: ${i.explicacao} (confiança ${Math.round(i.confianca * 100)}%)`).join("\n") : "Nenhum insight gerado ainda para esta competência."}
Recomendações (${dados.recomendacoes.length}):
${dados.recomendacoes.length ? dados.recomendacoes.map((r) => `- [${r.tipo}] ${r.texto}`).join("\n") : "Nenhuma recomendação gerada ainda para esta competência."}`;

    case "resumo_relatorio":
      return `Competência: ${formatCompetencia(dados.mesReferencia)}
Metodologia: ${dados.metodologia}
Conteúdo do relatório (HTML, sem a seção de distribuição por objetivos — propositalmente omitida):
${dados.conteudoHtmlSemObjetivos}`;
  }
}

function parseSecoes(texto: string): Record<(typeof MARCADORES)[number], string> {
  const resultado: Record<string, string> = {};
  for (let i = 0; i < MARCADORES.length; i++) {
    const marcador = MARCADORES[i];
    const proximo = MARCADORES[i + 1];
    const regex = proximo ? new RegExp(`${marcador}:([\\s\\S]*?)${proximo}:`) : new RegExp(`${marcador}:([\\s\\S]*)$`);
    const m = texto.match(regex);
    resultado[marcador] = m ? m[1].trim() : "";
  }
  return resultado as Record<(typeof MARCADORES)[number], string>;
}

function linhasParaItens(texto: string): ItemComLink[] {
  return texto
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .map((texto) => ({ texto }));
}

function respostaDeLimitacao(motivo: string | undefined): RespostaConsultor {
  return {
    respostaDireta: motivo ?? "Não encontrei dados suficientes para responder isso com fundamento ainda.",
    evidencias: [],
    interpretacao: "A pergunta não se encaixa nas consultas que o Consultor consegue fundamentar hoje, ou não há dado suficiente registrado para o período/competência mencionado.",
    ressalvas: "Nenhum número foi inventado — quando não há dado suficiente, o Consultor prefere reconhecer a limitação.",
    acoesPossiveis: [{ texto: "Tente perguntar sobre um total por categoria, comparação de períodos, maiores despesas, ou resumo de uma competência específica." }],
    aprofundamento: "",
  };
}

function respostaSemInsights(dados: DadosResumoInsights): RespostaConsultor {
  const linkEvidencia = linkEvidenciaDeDados(dados);
  return {
    respostaDireta: `Nenhum insight ou recomendação foi gerado para ${formatCompetencia(dados.mesReferencia)} até agora.`,
    evidencias: linkEvidencia ? [linkEvidencia] : [],
    interpretacao: "",
    ressalvas: "O motivo da ausência não é informado aqui (pode ser a primeira competência do acervo, ausência de variação notável, ou outro fator) — evite supor a causa sem verificar diretamente na competência.",
    acoesPossiveis: [{ texto: "Abrir a competência para conferir o estado completo.", href: linkEvidencia?.href }],
    aprofundamento: "",
  };
}

/**
 * Gera a resposta final do Consultor. Se `dados` for null (fora de escopo ou
 * sem dado suficiente), monta a resposta de limitação sem chamar a API —
 * sem custo e sem risco de invenção. Senão, chamada de texto livre à Claude
 * restrita aos dados já recuperados (mesmo padrão anti-alucinação do
 * Agente Narrador, Fase 7) — nunca decompõe por objetivo.
 */
export async function responderComDados(
  pergunta: string,
  intencao: IntencaoEstruturada,
  dados: DadosRecuperados | null,
): Promise<RespostaConsultor> {
  if (!dados) return respostaDeLimitacao(intencao.motivoForaDeEscopo);

  // Lista vazia não tem causa conhecida — deixar o LLM explicar "por que está
  // vazio" é como pedir pra ele adivinhar, e ele tende a inventar uma causa
  // plausível (ex.: "é a primeira competência") mesmo sem essa informação.
  // Resposta determinística evita esse risco por completo.
  if (dados.tipo === "resumo_insights_competencia" && dados.insights.length === 0 && dados.recomendacoes.length === 0) {
    return respostaSemInsights(dados);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — necessária para responder a pergunta.");

  const client = new Anthropic({ apiKey });

  const prompt = `Você é o Consultor da AURÓR · Hub Financeira, respondendo a uma pergunta da Família Gama sobre as finanças conjuntas da família.

REGRAS INEGOCIÁVEIS:
- Nunca invente valores, fornecedores, categorias ou eventos que não estejam explicitamente nos dados abaixo. Você só pode interpretar o que foi fornecido.
- Nunca mencione nomes de pessoas específicas (Victoria, Paulo, Malu) ou tente decompor o gasto por pessoa — essa informação não foi fornecida a você de propósito.
- Se os dados abaixo não tiverem conteúdo suficiente para uma seção, escreva um texto curto reconhecendo a limitação em vez de inventar.
- Se uma lista (insights, recomendações, despesas) vier vazia, apenas declare que está vazia. NUNCA infira ou invente um motivo para a ausência (ex.: não assuma "é a primeira competência", "não há dados suficientes ainda" ou qualquer outra causa) — isso não foi informado a você e seria uma invenção, mesmo que pareça uma explicação plausível.
- "Evidências" só pode conter fatos que estão literalmente nos dados abaixo — nunca uma inferência ou suposição, mesmo razoável.
- Responda em texto simples (sem HTML), organizado exatamente nas 6 seções abaixo, cada uma iniciada pelo marcador exato seguido de dois-pontos, em linha própria.

Pergunta original: "${pergunta}"

DADOS RECUPERADOS (única fonte de verdade — nada fora disto):
${montarTextoDados(dados)}

Responda EXATAMENTE neste formato, preenchendo cada seção:
RESPOSTA_DIRETA:
(resposta direta e objetiva à pergunta, com o número/fato principal)
EVIDENCIAS:
(lista com "-" citando os números/fatos exatos usados, um por linha)
INTERPRETACAO:
(o que esses números sugerem, em 1-2 frases)
RESSALVAS:
(limitações do dado ou do período — ex.: período parcial, poucos lançamentos)
ACOES_POSSIVEIS:
(lista com "-" de 1-3 ações concretas que a família poderia considerar, um por linha)
APROFUNDAMENTO:
(1 frase sugerindo uma pergunta de acompanhamento útil)`;

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const blocoTexto = resposta.content.find((b) => b.type === "text");
  if (!blocoTexto || blocoTexto.type !== "text" || !blocoTexto.text.trim()) {
    throw new Error("Resposta do Consultor veio vazia.");
  }

  const secoes = parseSecoes(blocoTexto.text);
  const linkEvidencia = linkEvidenciaDeDados(dados);
  const evidencias = linhasParaItens(secoes.EVIDENCIAS);
  if (linkEvidencia) evidencias.push(linkEvidencia);

  return {
    respostaDireta: secoes.RESPOSTA_DIRETA || "Não foi possível formular uma resposta direta.",
    evidencias,
    interpretacao: secoes.INTERPRETACAO,
    ressalvas: secoes.RESSALVAS,
    acoesPossiveis: linhasParaItens(secoes.ACOES_POSSIVEIS),
    aprofundamento: secoes.APROFUNDAMENTO,
  };
}
