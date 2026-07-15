import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { TermoTaxonomiaRow } from "./taxonomia";
import { indexarPorRotulo } from "./taxonomia";
import { sugerirPorPadraoGenerico, casarAlias, type AliasResolvido } from "./fornecedores";
import { regrasQueCasam, consequenciasDivergem, type RegraAtiva, type ExecucaoRegraParaGravar } from "@/lib/regras/motor";

export const VERSAO_CLASSIFICADOR = "be3-hibrido-v1";

export interface LancamentoParaClassificar {
  id: string;
  descricaoOriginal: string;
  valor: number; // centavos, com sinal (negativo = gasto)
  data: string; // AAAA-MM-DD
}

export interface PropostaGerada {
  lancamentoId: string;
  fornecedorSugeridoId: string | null;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
  contextoSugerido: string | null;
  confiancaCategoria: number | null;
  confiancaSubcategoria: number | null;
  confiancaObjetivo: number | null;
  confiancaGeral: number;
  justificativa: string;
  origem: "regra" | "llm";
}

interface ResultadoRegra {
  proposta: PropostaGerada | null;
  execucoes: ExecucaoRegraParaGravar[];
}

/**
 * Tenta classificar por regra determinística (sem custo de API), em ordem:
 * 1. Regras do Motor de Regras (Fase 4) — aprendidas ou criadas manualmente.
 *    Conflito entre regras ativas (RUL-13) nunca é resolvido em silêncio:
 *    nenhuma se aplica, ambas viram execução "bloqueada_por_conflito" e o
 *    lançamento cai pro próximo nível.
 * 2. Alias de fornecedor já cadastrado pelo perfil (BE-3).
 * 3. Padrão genérico conhecido (BE-3).
 * Retorna null quando não há nenhum sinal — esse lançamento vai pro lote da IA.
 */
function classificarPorRegra(
  lancamento: LancamentoParaClassificar,
  aliasesDoPerfil: AliasResolvido[],
  taxonomiaIndex: ReturnType<typeof indexarPorRotulo>,
  regrasAtivas: RegraAtiva[],
): ResultadoRegra {
  const regrasCasadas = regrasQueCasam(lancamento.descricaoOriginal, regrasAtivas);
  if (regrasCasadas.length > 0) {
    if (consequenciasDivergem(regrasCasadas)) {
      return {
        proposta: null,
        execucoes: regrasCasadas.map((r) => ({ regraId: r.id, lancamentoId: lancamento.id, resultado: "bloqueada_por_conflito" as const })),
      };
    }
    const regra = regrasCasadas[0];
    return {
      proposta: {
        lancamentoId: lancamento.id,
        fornecedorSugeridoId: null,
        categoriaId: regra.categoriaId,
        subcategoriaId: regra.subcategoriaId,
        objetivoId: regra.objetivoId,
        contextoSugerido: null,
        confiancaCategoria: regra.categoriaId ? regra.confianca : null,
        confiancaSubcategoria: regra.subcategoriaId ? regra.confianca : null,
        confiancaObjetivo: regra.objetivoId ? regra.confianca * 0.8 : null,
        confiancaGeral: regra.confianca,
        justificativa: `Regra aplicada — fornecedor contém "${regra.textoCondicao}" (aprendida a partir de correções anteriores ou criada manualmente).`,
        origem: "regra",
      },
      execucoes: [{ regraId: regra.id, lancamentoId: lancamento.id, resultado: "aplicada" }],
    };
  }

  const aliasCasado = casarAlias(lancamento.descricaoOriginal, aliasesDoPerfil);
  if (aliasCasado) {
    const categoria = taxonomiaIndex.buscar("categoria", aliasCasado.categoriaDominanteRotulo);
    return {
      proposta: {
        lancamentoId: lancamento.id,
        fornecedorSugeridoId: aliasCasado.fornecedorPadronizadoId,
        categoriaId: categoria?.id ?? null,
        subcategoriaId: null,
        objetivoId: null,
        contextoSugerido: null,
        confiancaCategoria: categoria ? 0.9 : null,
        confiancaSubcategoria: null,
        confiancaObjetivo: null,
        confiancaGeral: categoria ? 0.9 : 0.3,
        justificativa: categoria
          ? `Fornecedor "${aliasCasado.nomeOficial}" já está cadastrado como padronizado — categoria aplicada com base nisso.`
          : `Fornecedor "${aliasCasado.nomeOficial}" já está cadastrado, mas ainda sem categoria dominante definida — requer revisão manual.`,
        origem: "regra",
      },
      execucoes: [],
    };
  }

  const generico = sugerirPorPadraoGenerico(lancamento.descricaoOriginal);
  if (generico) {
    const categoria = taxonomiaIndex.buscar("categoria", generico.categoria);
    const subcategoria = taxonomiaIndex.buscar("subcategoria", generico.subcategoria);
    return {
      proposta: {
        lancamentoId: lancamento.id,
        fornecedorSugeridoId: null,
        categoriaId: categoria?.id ?? null,
        subcategoriaId: subcategoria?.id ?? null,
        objetivoId: null,
        contextoSugerido: null,
        confiancaCategoria: 0.7,
        confiancaSubcategoria: 0.65,
        confiancaObjetivo: null,
        confiancaGeral: 0.65,
        justificativa: `Padrão de fornecedor conhecido genericamente (não específico da sua família ainda) sugere esta categoria. Objetivo não é sugerido por regra — depende de quem/para que foi o gasto.`,
        origem: "regra",
      },
      execucoes: [],
    };
  }

  return { proposta: null, execucoes: [] };
}

interface ItemParaLlm {
  id: string;
  descricao: string;
  valorReais: number;
  data: string;
}

const FERRAMENTA_CLASSIFICACAO = {
  name: "classificar_lancamentos",
  description: "Retorna a classificação sugerida para cada lançamento financeiro informado.",
  input_schema: {
    type: "object" as const,
    properties: {
      classificacoes: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const, description: "Mesmo id recebido na entrada." },
            categoria: { type: "string" as const, description: "Um rótulo exato da lista de categorias fornecida." },
            subcategoria: { type: "string" as const, description: "Um rótulo exato da lista de subcategorias da categoria escolhida." },
            objetivo: { type: "string" as const, description: "Um rótulo exato da lista de objetivos fornecida. Use 'Não identificado' quando não houver evidência suficiente." },
            contexto: { type: "string" as const, description: "Texto livre curto complementar (opcional, pode ser vazio)." },
            confiancaCategoria: { type: "number" as const, description: "0 a 1." },
            confiancaSubcategoria: { type: "number" as const, description: "0 a 1." },
            confiancaObjetivo: { type: "number" as const, description: "0 a 1. Deve ser mais conservadora que a de categoria — fornecedor sozinho não define objetivo." },
            justificativa: { type: "string" as const, description: "Explicação curta e específica do porquê desta classificação." },
          },
          required: ["id", "categoria", "subcategoria", "objetivo", "confiancaCategoria", "confiancaSubcategoria", "confiancaObjetivo", "justificativa"],
        },
      },
    },
    required: ["classificacoes"],
  },
};

async function classificarLotePorLlm(
  itens: ItemParaLlm[],
  categorias: string[],
  subcategoriasPorCategoria: Map<string, string[]>,
  objetivos: string[],
): Promise<Map<string, { categoria: string; subcategoria: string; objetivo: string; contexto: string; confiancaCategoria: number; confiancaSubcategoria: number; confiancaObjetivo: number; justificativa: string }>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — necessária para classificar fornecedores novos.");

  const client = new Anthropic({ apiKey });

  const listaSubcategorias = [...subcategoriasPorCategoria.entries()]
    .map(([cat, subs]) => `- ${cat}: ${subs.join(", ")}`)
    .join("\n");

  const prompt = `Classifique cada lançamento financeiro abaixo dentro das dimensões categoria, subcategoria e objetivo.

Regras importantes:
- Use SOMENTE os rótulos exatos das listas abaixo — nunca invente uma categoria/subcategoria/objetivo novo.
- A subcategoria escolhida precisa pertencer à categoria escolhida.
- Nunca assuma que o titular do cartão define o objetivo. Sem evidência clara de para quem/qual finalidade foi o gasto, use objetivo "Não identificado" com confiança baixa.
- Fornecedores como Amazon/Mercado Livre têm categoria variável — julgue pela descrição, não por um padrão fixo.
- Confiança em objetivo deve normalmente ser mais baixa que em categoria, pois depende de mais contexto.

Categorias disponíveis: ${categorias.join(", ")}

Subcategorias por categoria:
${listaSubcategorias}

Objetivos disponíveis: ${objetivos.join(", ")}

Lançamentos (id, descrição do fornecedor, valor em reais com sinal — negativo é gasto, positivo é crédito/estorno —, data):
${JSON.stringify(itens.map((i) => ({ id: i.id, descricao: i.descricao, valor: i.valorReais, data: i.data })))}`;

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    tools: [FERRAMENTA_CLASSIFICACAO],
    tool_choice: { type: "tool", name: "classificar_lancamentos" },
    messages: [{ role: "user", content: prompt }],
  });

  const blocoFerramenta = resposta.content.find((b) => b.type === "tool_use");
  if (!blocoFerramenta || blocoFerramenta.type !== "tool_use") {
    throw new Error("Resposta da IA não trouxe classificações no formato esperado.");
  }

  const resultado = blocoFerramenta.input as {
    classificacoes: {
      id: string;
      categoria: string;
      subcategoria: string;
      objetivo: string;
      contexto?: string;
      confiancaCategoria: number;
      confiancaSubcategoria: number;
      confiancaObjetivo: number;
      justificativa: string;
    }[];
  };

  const mapa = new Map<string, (typeof resultado.classificacoes)[number] & { contexto: string }>();
  for (const c of resultado.classificacoes) {
    mapa.set(c.id, { ...c, contexto: c.contexto ?? "" });
  }
  return mapa;
}

const TAMANHO_LOTE_LLM = 50;

export interface ResultadoClassificacao {
  propostas: PropostaGerada[];
  execucoesRegra: ExecucaoRegraParaGravar[];
}

/** Classifica um conjunto de lançamentos: Motor de Regras (Fase 4) → alias/padrão genérico (BE-3) → fallback em lote via IA. */
export async function classificarLancamentos(
  lancamentos: LancamentoParaClassificar[],
  aliasesDoPerfil: AliasResolvido[],
  taxonomia: TermoTaxonomiaRow[],
  regrasAtivas: RegraAtiva[] = [],
): Promise<ResultadoClassificacao> {
  const taxonomiaIndex = indexarPorRotulo(taxonomia);
  const propostas: PropostaGerada[] = [];
  const execucoesRegra: ExecucaoRegraParaGravar[] = [];
  const pendentesLlm: LancamentoParaClassificar[] = [];

  for (const lancamento of lancamentos) {
    const resultado = classificarPorRegra(lancamento, aliasesDoPerfil, taxonomiaIndex, regrasAtivas);
    execucoesRegra.push(...resultado.execucoes);
    if (resultado.proposta) propostas.push(resultado.proposta);
    else pendentesLlm.push(lancamento);
  }

  if (pendentesLlm.length === 0) return { propostas, execucoesRegra };

  const categorias = taxonomia.filter((t) => t.dimensao === "categoria");
  const objetivos = taxonomia.filter((t) => t.dimensao === "objetivo").map((t) => t.rotulo);
  const subcategoriasPorCategoria = new Map<string, string[]>();
  for (const categoria of categorias) {
    subcategoriasPorCategoria.set(
      categoria.rotulo,
      taxonomia.filter((t) => t.dimensao === "subcategoria" && t.termoPaiId === categoria.id).map((t) => t.rotulo),
    );
  }
  const rotulosCategorias = categorias.map((c) => c.rotulo);

  for (let i = 0; i < pendentesLlm.length; i += TAMANHO_LOTE_LLM) {
    const lote = pendentesLlm.slice(i, i + TAMANHO_LOTE_LLM);
    const itensParaLlm: ItemParaLlm[] = lote.map((l) => ({
      id: l.id,
      descricao: l.descricaoOriginal,
      valorReais: l.valor / 100,
      data: l.data,
    }));

    const resultado = await classificarLotePorLlm(itensParaLlm, rotulosCategorias, subcategoriasPorCategoria, objetivos);

    for (const lancamento of lote) {
      const c = resultado.get(lancamento.id);
      if (!c) {
        propostas.push({
          lancamentoId: lancamento.id,
          fornecedorSugeridoId: null,
          categoriaId: null,
          subcategoriaId: null,
          objetivoId: null,
          contextoSugerido: null,
          confiancaCategoria: null,
          confiancaSubcategoria: null,
          confiancaObjetivo: null,
          confiancaGeral: 0,
          justificativa: "A IA não retornou uma classificação para este lançamento — requer revisão manual.",
          origem: "llm",
        });
        continue;
      }

      const categoria = taxonomiaIndex.buscar("categoria", c.categoria);
      const subcategoria = taxonomiaIndex.buscar("subcategoria", c.subcategoria);
      const objetivo = taxonomiaIndex.buscar("objetivo", c.objetivo);

      propostas.push({
        lancamentoId: lancamento.id,
        fornecedorSugeridoId: null,
        categoriaId: categoria?.id ?? null,
        subcategoriaId: subcategoria?.id ?? null,
        objetivoId: objetivo?.id ?? null,
        contextoSugerido: c.contexto || null,
        confiancaCategoria: categoria ? c.confiancaCategoria : null,
        confiancaSubcategoria: subcategoria ? c.confiancaSubcategoria : null,
        confiancaObjetivo: objetivo ? c.confiancaObjetivo : null,
        confiancaGeral: (c.confiancaCategoria + c.confiancaSubcategoria + c.confiancaObjetivo) / 3,
        justificativa: c.justificativa,
        origem: "llm",
      });
    }
  }

  return { propostas, execucoesRegra };
}
