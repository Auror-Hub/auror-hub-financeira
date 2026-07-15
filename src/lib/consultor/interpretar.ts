import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type IntencaoConsultor =
  | "total_categoria_periodo"
  | "comparacao_periodos"
  | "maiores_despesas"
  | "resumo_insights_competencia"
  | "resumo_relatorio"
  | "fora_de_escopo";

export interface IntencaoEstruturada {
  intencao: IntencaoConsultor;
  categoriaRotulo?: string;
  dataInicio?: string;
  dataFim?: string;
  periodoAInicio?: string;
  periodoAFim?: string;
  periodoBInicio?: string;
  periodoBFim?: string;
  mesReferencia?: string;
  limite?: number;
  motivoForaDeEscopo?: string;
}

const FERRAMENTA_INTERPRETACAO = {
  name: "interpretar_pergunta",
  description: "Extrai a intenção estruturada de uma pergunta financeira feita ao Consultor.",
  input_schema: {
    type: "object" as const,
    properties: {
      intencao: {
        type: "string" as const,
        enum: [
          "total_categoria_periodo",
          "comparacao_periodos",
          "maiores_despesas",
          "resumo_insights_competencia",
          "resumo_relatorio",
          "fora_de_escopo",
        ],
        description: "Qual das 6 intenções suportadas melhor descreve a pergunta.",
      },
      categoriaRotulo: { type: "string" as const, description: "Rótulo exato de uma das categorias disponíveis, se a pergunta mencionar categoria." },
      dataInicio: { type: "string" as const, description: "AAAA-MM-DD — início do período, para total_categoria_periodo/maiores_despesas." },
      dataFim: { type: "string" as const, description: "AAAA-MM-DD — fim do período." },
      periodoAInicio: { type: "string" as const, description: "AAAA-MM-DD — início do primeiro período, para comparacao_periodos." },
      periodoAFim: { type: "string" as const, description: "AAAA-MM-DD — fim do primeiro período." },
      periodoBInicio: { type: "string" as const, description: "AAAA-MM-DD — início do segundo período." },
      periodoBFim: { type: "string" as const, description: "AAAA-MM-DD — fim do segundo período." },
      mesReferencia: { type: "string" as const, description: "AAAA-MM — competência mencionada, para resumo_insights_competencia/resumo_relatorio." },
      limite: { type: "number" as const, description: "Quantidade pedida, para maiores_despesas (padrão 5)." },
      motivoForaDeEscopo: { type: "string" as const, description: "Só quando intencao=fora_de_escopo — explicação curta de por quê." },
    },
    required: ["intencao"],
  },
};

/**
 * Interpreta a pergunta livre do usuário em uma das 6 intenções suportadas
 * via tool-use (mesmo padrão de FERRAMENTA_CLASSIFICACAO em
 * classificacao/motor.ts). Nunca deixa a IA "responder" aqui — só extrair
 * estrutura; a busca de dado é sempre código determinístico (recuperar.ts).
 */
export async function interpretarPergunta(pergunta: string, categoriasDisponiveis: string[]): Promise<IntencaoEstruturada> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — necessária para interpretar a pergunta.");

  const client = new Anthropic({ apiKey });

  const hoje = new Date().toISOString().slice(0, 10);
  const prompt = `Você interpreta perguntas financeiras da Família Gama feitas ao Consultor da AURÓR · Hub Financeira.

Data de hoje: ${hoje}.

Categorias disponíveis (use o rótulo exato, nunca invente uma nova): ${categoriasDisponiveis.join(", ")}

Só existem 5 intenções suportadas — escolha "fora_de_escopo" para qualquer coisa que não encaixe exatamente:
1. total_categoria_periodo — quanto foi gasto numa categoria num intervalo de datas.
2. comparacao_periodos — comparar gasto (de uma categoria ou total) entre dois intervalos de datas.
3. maiores_despesas — quais foram os maiores lançamentos num período.
4. resumo_insights_competencia — resumo dos insights/recomendações já gerados de um mês (competência).
5. resumo_relatorio — resumo do relatório executivo já gerado de um mês.

Regras obrigatórias:
- Se a pergunta pedir quebra de gasto por pessoa, membro da família ou "objetivo" (ex.: "quanto o Paulo gastou", "gasto da Malu", "por pessoa") → SEMPRE intencao="fora_de_escopo", motivoForaDeEscopo curto explicando que o Consultor não decompõe gasto por pessoa em consulta livre.
- Se a pergunta não tiver dado temporal suficiente para resolver datas (ex.: "esse mês" sem mês claro) assuma o mês corrente a partir da data de hoje.
- Nunca invente uma categoria fora da lista — se a categoria mencionada não estiver na lista, use fora_de_escopo.

Pergunta: "${pergunta}"`;

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [FERRAMENTA_INTERPRETACAO],
    tool_choice: { type: "tool", name: "interpretar_pergunta" },
    messages: [{ role: "user", content: prompt }],
  });

  const blocoFerramenta = resposta.content.find((b) => b.type === "tool_use");
  if (!blocoFerramenta || blocoFerramenta.type !== "tool_use") {
    return { intencao: "fora_de_escopo", motivoForaDeEscopo: "Não foi possível interpretar a pergunta." };
  }

  return blocoFerramenta.input as IntencaoEstruturada;
}
