import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type IntencaoConsultor =
  | "total_categoria_periodo"
  | "comparacao_periodos"
  | "maiores_despesas"
  | "resumo_insights_competencia"
  | "resumo_relatorio"
  | "criar_rascunho_meta"
  | "criar_rascunho_ajuste_plano"
  | "criar_lancamento_provisorio"
  | "criar_rascunho_correcao_classificacao"
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
  // Rearquitetura (Fase 4, ADR-007): parâmetros das 4 intenções de mutação —
  // sempre produzem um RASCUNHO (rascunho.ts), nunca uma ação direta.
  subcategoriaRotulo?: string;
  objetivoRotulo?: string;
  tipoMeta?: "limite_absoluto" | "reducao_percentual";
  valorLimiteReais?: number;
  percentualAlvo?: number;
  periodoMeses?: number;
  descricaoUsuario?: string;
  valorReais?: number;
  dataOcorrencia?: string;
  fornecedorTexto?: string;
  dataAproximada?: string;
  novaCategoriaRotulo?: string;
  novaSubcategoriaRotulo?: string;
  novoObjetivoRotulo?: string;
}

const FERRAMENTA_INTERPRETACAO = {
  name: "interpretar_pergunta",
  description: "Extrai a intenção estruturada de uma mensagem financeira feita ao Consultor.",
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
          "criar_rascunho_meta",
          "criar_rascunho_ajuste_plano",
          "criar_lancamento_provisorio",
          "criar_rascunho_correcao_classificacao",
          "fora_de_escopo",
        ],
        description: "Qual das 9 intenções suportadas melhor descreve a mensagem.",
      },
      categoriaRotulo: { type: "string" as const, description: "Rótulo exato de uma categoria, se mencionada." },
      dataInicio: { type: "string" as const, description: "AAAA-MM-DD — início do período, para total_categoria_periodo/maiores_despesas." },
      dataFim: { type: "string" as const, description: "AAAA-MM-DD — fim do período." },
      periodoAInicio: { type: "string" as const, description: "AAAA-MM-DD — início do primeiro período, para comparacao_periodos." },
      periodoAFim: { type: "string" as const, description: "AAAA-MM-DD — fim do primeiro período." },
      periodoBInicio: { type: "string" as const, description: "AAAA-MM-DD — início do segundo período." },
      periodoBFim: { type: "string" as const, description: "AAAA-MM-DD — fim do segundo período." },
      mesReferencia: { type: "string" as const, description: "AAAA-MM — competência mencionada, para resumo_insights_competencia/resumo_relatorio." },
      limite: { type: "number" as const, description: "Quantidade pedida, para maiores_despesas (padrão 5)." },
      motivoForaDeEscopo: { type: "string" as const, description: "Só quando intencao=fora_de_escopo — explicação curta de por quê." },
      subcategoriaRotulo: { type: "string" as const, description: "Rótulo exato de subcategoria, para criar_rascunho_meta (opcional)." },
      objetivoRotulo: { type: "string" as const, description: "Rótulo exato de objetivo, para criar_rascunho_meta/criar_lancamento_provisorio (opcional)." },
      tipoMeta: {
        type: "string" as const,
        enum: ["limite_absoluto", "reducao_percentual"],
        description: "Tipo da meta pra criar_rascunho_meta — valor fixo ou redução % sobre histórico.",
      },
      valorLimiteReais: { type: "number" as const, description: "Valor em reais do limite, para criar_rascunho_meta (tipo limite_absoluto) ou criar_rascunho_ajuste_plano." },
      percentualAlvo: { type: "number" as const, description: "Percentual de redução alvo (1-99), para criar_rascunho_meta (tipo reducao_percentual)." },
      periodoMeses: { type: "number" as const, enum: [1, 3, 6, 12], description: "Período de comparação em meses, para criar_rascunho_meta (tipo reducao_percentual)." },
      descricaoUsuario: { type: "string" as const, description: "Descrição do gasto, para criar_lancamento_provisorio." },
      valorReais: { type: "number" as const, description: "Valor em reais do gasto, para criar_lancamento_provisorio." },
      dataOcorrencia: { type: "string" as const, description: "AAAA-MM-DD — data do gasto, para criar_lancamento_provisorio." },
      fornecedorTexto: { type: "string" as const, description: "Texto do fornecedor mencionado, para criar_lancamento_provisorio/criar_rascunho_correcao_classificacao." },
      dataAproximada: { type: "string" as const, description: "AAAA-MM-DD — data aproximada mencionada, para localizar o lançamento em criar_rascunho_correcao_classificacao." },
      novaCategoriaRotulo: { type: "string" as const, description: "Nova categoria, para criar_rascunho_correcao_classificacao." },
      novaSubcategoriaRotulo: { type: "string" as const, description: "Nova subcategoria (opcional), para criar_rascunho_correcao_classificacao." },
      novoObjetivoRotulo: { type: "string" as const, description: "Novo objetivo (opcional), para criar_rascunho_correcao_classificacao." },
    },
    required: ["intencao"],
  },
};

/**
 * Interpreta a mensagem livre do usuário em uma das 9 intenções suportadas
 * via tool-use (mesmo padrão de FERRAMENTA_CLASSIFICACAO em
 * classificacao/motor.ts). Nunca deixa a IA "responder" ou "agir" aqui — só
 * extrair estrutura; a busca/preparação de dado é sempre código
 * determinístico (recuperar.ts/rascunho.ts), e as 4 intenções de mutação
 * (Fase 4, ADR-007) só produzem um RASCUNHO — a ação real depende de
 * confirmação humana explícita no chat, nunca acontece aqui.
 */
export async function interpretarPergunta(pergunta: string, categoriasDisponiveis: string[]): Promise<IntencaoEstruturada> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — necessária para interpretar a pergunta.");

  const client = new Anthropic({ apiKey });

  const hoje = new Date().toISOString().slice(0, 10);
  const prompt = `Você interpreta mensagens financeiras da Família Gama feitas ao Consultor da AURÓR · Hub Financeira.

Data de hoje: ${hoje}.

Categorias disponíveis (use o rótulo exato, nunca invente uma nova): ${categoriasDisponiveis.join(", ")}

Só existem 9 intenções suportadas — escolha "fora_de_escopo" para qualquer coisa que não encaixe exatamente:

Leitura (nunca mudam nada):
1. total_categoria_periodo — quanto foi gasto numa categoria num intervalo de datas.
2. comparacao_periodos — comparar gasto (de uma categoria ou total) entre dois intervalos de datas.
3. maiores_despesas — quais foram os maiores lançamentos num período.
4. resumo_insights_competencia — resumo dos insights/recomendações já gerados de um mês (competência).
5. resumo_relatorio — resumo do relatório executivo já gerado de um mês.

Mutação (SEMPRE produzem um rascunho pra confirmação — nunca executam nada sozinhas):
6. criar_rascunho_meta — pedido pra criar uma meta/orçamento nova (ex.: "cria uma meta de R$500 em Lazer", "quero reduzir 10% em Transporte vs os últimos 3 meses").
7. criar_rascunho_ajuste_plano — pedido pra mudar o VALOR de uma meta que já existe (ex.: "aumenta o limite de Alimentação pra R$800").
8. criar_lancamento_provisorio — pedido pra anotar um gasto que ainda não apareceu no extrato/fatura (ex.: "anota que gastei R$50 no almoço hoje").
9. criar_rascunho_correcao_classificacao — pedido pra corrigir a categoria de um lançamento específico (ex.: "o gasto no Posto Ipiranga de ontem é Transporte, não Alimentação").

Regras obrigatórias:
- Se a pergunta pedir quebra de gasto por pessoa, membro da família ou "objetivo" (ex.: "quanto o Paulo gastou", "gasto da Malu", "por pessoa") → SEMPRE intencao="fora_de_escopo", motivoForaDeEscopo curto explicando que o Consultor não decompõe gasto por pessoa em consulta livre.
- Se a pergunta não tiver dado temporal suficiente para resolver datas (ex.: "esse mês" sem mês claro) assuma o mês corrente a partir da data de hoje.
- Nunca invente uma categoria fora da lista — se a categoria mencionada não estiver na lista, use fora_de_escopo.
- Pra criar_lancamento_provisorio, se não houver data explícita, assuma hoje.
- Pra criar_rascunho_correcao_classificacao, extraia o texto do fornecedor e a data aproximada literalmente como foram ditos — nunca resolva você mesmo qual lançamento é; isso é responsabilidade do código.

Mensagem: "${pergunta}"`;

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [FERRAMENTA_INTERPRETACAO],
    tool_choice: { type: "tool", name: "interpretar_pergunta" },
    messages: [{ role: "user", content: prompt }],
  });

  const blocoFerramenta = resposta.content.find((b) => b.type === "tool_use");
  if (!blocoFerramenta || blocoFerramenta.type !== "tool_use") {
    return { intencao: "fora_de_escopo", motivoForaDeEscopo: "Não foi possível interpretar a mensagem." };
  }

  return blocoFerramenta.input as IntencaoEstruturada;
}
