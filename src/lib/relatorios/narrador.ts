import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Supabase } from "@/lib/competencias/reabertura";
import type { Insight, Recomendacao } from "@/lib/domain/types";
import { formatBRL, formatCompetencia } from "@/lib/format";

const VERSAO_NARRADOR = "narrador-llm-v0";
const MODELO = "claude-haiku-4-5-20251001";
const MARCADOR_SECAO_OBJETIVOS = "<!--SECAO-6-OBJETIVOS-->";

interface DadosCongelados {
  totalLancamentos: number;
  totalConsolidado: number;
  quebraPorCategoria: Record<string, number>;
  quebraPorObjetivo: Record<string, number>;
  maioresDespesas: { fornecedor: string; valor: number }[];
}

function montarPrompt(
  mesReferencia: string,
  dadosCongelados: DadosCongelados,
  categoriaRotulos: Map<string, string>,
  insights: Insight[],
  recomendacoes: Recomendacao[],
  nomeFamilia: string,
): string {
  const quebraPorCategoriaTexto = Object.entries(dadosCongelados.quebraPorCategoria)
    .map(([id, valor]) => `- ${categoriaRotulos.get(id) ?? "categoria desconhecida"}: ${formatBRL(valor)}`)
    .join("\n");

  const maioresDespesasTexto = dadosCongelados.maioresDespesas
    .map((d) => `- ${d.fornecedor}: ${formatBRL(d.valor)}`)
    .join("\n");

  const insightsTexto = insights.length
    ? insights
        .map((i) => `- [${i.tipo}] ${i.titulo}: ${i.explicacao} (confiança ${Math.round(i.confianca * 100)}%)`)
        .join("\n")
    : "Nenhum insight de variação relevante foi detectado nesta competência.";

  const recomendacoesTexto = recomendacoes.length
    ? recomendacoes.map((r) => `- [${r.tipo}] ${r.texto}`).join("\n")
    : "Nenhuma recomendação gerada nesta competência.";

  return `Você é o Agente Narrador da AURÓR · Hub Financeira — transforma análises financeiras já calculadas em um relatório executivo HTML para a família ${nomeFamilia}, sobre as finanças conjuntas da família.

REGRAS INEGOCIÁVEIS:
- Nunca invente valores, fornecedores, categorias ou eventos que não estejam explicitamente nos dados abaixo. Você só pode interpretar o que foi fornecido.
- Para qualquer seção sem dado suficiente para uma afirmação específica, escreva um texto curto reconhecendo a limitação (ex.: "ainda não há dados suficientes para X") em vez de inventar conteúdo.
- Nunca mencione nomes de membros específicos da família ou a distribuição de gastos por pessoa — essa informação não foi fornecida a você de propósito e não deve ser citada nem estimada.
- Gráficos são opcionais e nunca substituem a interpretação em texto.
- Responda APENAS com o HTML do conteúdo (elementos como <h2>, <p>, <ul>, <table> etc.) — sem <html>, <head>, <body> ou <script>.

Gere o relatório executivo com exatamente estas seções, nesta ordem, cada uma com um <h2> com o título exato:
1. Resumo executivo
2. Situação geral
3. Principais mudanças
4. Explicação das variações
5. Distribuição por categorias
${MARCADOR_SECAO_OBJETIVOS}
7. Maiores despesas
8. Despesas extraordinárias
9. Mudanças de comportamento
10. Comparação histórica
11. Alertas
12. Possibilidades de economia
13. Conclusões
14. Pontos a observar na próxima competência

Insira exatamente o texto "${MARCADOR_SECAO_OBJETIVOS}" (sem alterações) no lugar indicado acima, entre as seções 5 e 7 — essa seção 6 (Distribuição por objetivos) é preenchida por código, não por você.

DADOS DA COMPETÊNCIA ${formatCompetencia(mesReferencia)}:

Total consolidado: ${formatBRL(dadosCongelados.totalConsolidado)}
Total de lançamentos: ${dadosCongelados.totalLancamentos}

Distribuição por categoria:
${quebraPorCategoriaTexto || "Nenhuma categoria registrada."}

Maiores despesas individuais:
${maioresDespesasTexto || "Nenhum lançamento registrado."}

Insights detectados pelo Agente Analista:
${insightsTexto}

Recomendações do Agente Analista:
${recomendacoesTexto}`;
}

function montarSecaoObjetivos(dadosCongelados: DadosCongelados, objetivoRotulos: Map<string, string>): string {
  const linhas = Object.entries(dadosCongelados.quebraPorObjetivo)
    .map(([id, valor]) => {
      const percentual = dadosCongelados.totalConsolidado !== 0 ? Math.round((valor / dadosCongelados.totalConsolidado) * 100) : 0;
      return `<tr><td>${objetivoRotulos.get(id) ?? "—"}</td><td>${formatBRL(valor)}</td><td>${percentual}%</td></tr>`;
    })
    .join("");

  return `<h2>Distribuição por objetivos</h2><table><thead><tr><th>Objetivo</th><th>Valor</th><th>%</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

function montarShellHtml(mesReferencia: string, conteudo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Relatório executivo — ${formatCompetencia(mesReferencia)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1.5rem;line-height:1.6;color:#1c1c1c}h2{margin-top:2rem;border-bottom:1px solid #ddd;padding-bottom:.25rem}table{width:100%;border-collapse:collapse;margin:.5rem 0}td,th{padding:.4rem .6rem;border-bottom:1px solid #eee;text-align:left}</style>
</head><body>${conteudo}</body></html>`;
}

/**
 * Agente Narrador (Fase 7) — gera o relatório executivo via API da Claude
 * (texto livre, sem tool use). Nunca envia quebraPorObjetivo à API — a seção
 * de objetivos é montada por código e inserida no lugar do marcador.
 */
export async function gerarRelatorio(
  supabase: Supabase,
  competenciaId: string,
  mesReferencia: string,
  snapshotId: string,
  dadosCongelados: DadosCongelados,
  insights: Insight[],
  recomendacoes: Recomendacao[],
  nomeFamilia: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada — necessária para gerar o relatório executivo.");

  const idsCategorias = Object.keys(dadosCongelados.quebraPorCategoria);
  const idsObjetivos = Object.keys(dadosCongelados.quebraPorObjetivo);
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", [...idsCategorias, ...idsObjetivos].length > 0 ? [...idsCategorias, ...idsObjetivos] : ["00000000-0000-0000-0000-000000000000"]);
  const rotulosPorId = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const client = new Anthropic({ apiKey });
  const prompt = montarPrompt(mesReferencia, dadosCongelados, rotulosPorId, insights, recomendacoes, nomeFamilia);

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const blocoTexto = resposta.content.find((b) => b.type === "text");
  if (!blocoTexto || blocoTexto.type !== "text" || !blocoTexto.text.trim()) {
    throw new Error("Resposta do Agente Narrador veio vazia.");
  }

  const secaoObjetivos = montarSecaoObjetivos(dadosCongelados, rotulosPorId);
  const conteudoComObjetivos = blocoTexto.text.includes(MARCADOR_SECAO_OBJETIVOS)
    ? blocoTexto.text.replace(MARCADOR_SECAO_OBJETIVOS, secaoObjetivos)
    : `${blocoTexto.text}${secaoObjetivos}`;

  const htmlFinal = montarShellHtml(mesReferencia, conteudoComObjetivos);

  // `relatorios` é append-only por design (só select/insert) — nunca fazer
  // upsert/update nela; se já existe uma linha para esta competência, reaproveita.
  const { data: relatorioExistente, error: errBuscarRelatorio } = await supabase
    .from("relatorios")
    .select("id")
    .eq("competencia_id", competenciaId)
    .maybeSingle();
  if (errBuscarRelatorio) throw new Error("Falha ao buscar relatório: " + errBuscarRelatorio.message);

  let relatorioId: string;
  if (relatorioExistente) {
    relatorioId = relatorioExistente.id as string;
  } else {
    const { data: novoRelatorio, error: errRelatorio } = await supabase
      .from("relatorios")
      .insert({ competencia_id: competenciaId })
      .select()
      .single();
    if (errRelatorio || !novoRelatorio) throw new Error("Falha ao gravar relatório: " + (errRelatorio?.message ?? "erro desconhecido"));
    relatorioId = novoRelatorio.id as string;
  }

  await supabase.from("relatorio_versoes").update({ status: "superseded" }).eq("relatorio_id", relatorioId).eq("status", "vigente");

  const { data: ultimaVersao } = await supabase
    .from("relatorio_versoes")
    .select("versao")
    .eq("relatorio_id", relatorioId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const novaVersao = (ultimaVersao?.versao as number | undefined ?? 0) + 1;

  const { error: errVersao } = await supabase.from("relatorio_versoes").insert({
    relatorio_id: relatorioId,
    versao: novaVersao,
    snapshot_id: snapshotId,
    conteudo_html: htmlFinal,
    metodologia: `Motor analítico determinístico (${VERSAO_NARRADOR}) + Agente Narrador via API da Claude (${MODELO}). Seção de distribuição por objetivos gerada por código, não narrada por IA.`,
    insights_utilizados: insights.map((i) => i.id),
  });
  if (errVersao) throw new Error("Falha ao gravar versão do relatório: " + errVersao.message);
}
