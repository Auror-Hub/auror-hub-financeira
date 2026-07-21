import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Supabase } from "@/lib/competencias/reabertura";
import type { Insight, Recomendacao } from "@/lib/domain/types";
import type { MetaComProgresso } from "@/lib/metas/consulta";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { selecionarModulos, type ModuloElegivel, type ModuloRelatorioSlug, type PacoteDadosRelatorio } from "./orquestrador";
import { validarRelatorio, extrairValoresCitados } from "./validacao";
import { montarComparacaoExterna, type ComparacaoExterna } from "./benchmark";

const VERSAO_NARRADOR = "narrador-llm-v1";
const MODELO = "claude-haiku-4-5-20251001";
const MARCADOR_SECAO = (slug: string) => `<<<SECAO:${slug}>>>`;

interface DadosCongelados {
  totalLancamentos: number;
  totalConsolidado: number;
  quebraPorCategoria: Record<string, number>;
  quebraPorObjetivo: Record<string, number>;
  maioresDespesas: { fornecedor: string; valor: number }[];
}

export interface SecaoRelatorio {
  slug: string;
  titulo: string;
  corpo: string;
}

const DESCRICAO_MODULO: Record<ModuloRelatorioSlug, string> = {
  resumo_executivo: "2 a 3 frases diretas sobre o mês — total gasto, tendência geral, sem rodeios.",
  fechamento_do_mes: "Total consolidado, número de lançamentos e cobertura de revisão do mês (dados abaixo).",
  o_que_mudou: "As principais variações e insights detectados pelo Agente Analista (lista de insights abaixo) — em linguagem direta, sem repetir os números literalmente se já apareceram no resumo executivo.",
  metas_e_decisoes: "Progresso das metas ativas (lista abaixo). Se não houver nenhuma meta ativa, diga isso diretamente em vez de inventar conteúdo.",
  proximo_ciclo: "Pontos a observar na próxima competência, com base nas recomendações do Agente Analista (lista abaixo) — nunca recomendação vaga sem base nos dados.",
  composicao: "Como o total se distribui entre as categorias listadas abaixo — quais concentram mais, e se algo chama atenção na distribuição.",
  fora_do_padrao: "As variações de categoria fora do esperado (insights do tipo variação de categoria, listados abaixo), com os números específicos já fornecidos.",
  comparacao_historica: "Como este mês se compara ao histórico, usando o insight de variação total já calculado abaixo — nunca compare com um número que não foi fornecido.",
  renda_e_saude: "Quanto da renda informada foi planejado/comprometido e quanto sobrou, usando os números de renda e plano abaixo.",
  benchmark_externo: "Comparação com referências externas — só use números explicitamente fornecidos abaixo; se nenhum dado externo foi fornecido, diga que a comparação não está disponível.",
};

export interface DadosNarrador {
  dadosCongelados: DadosCongelados;
  categoriaRotulos: Map<string, string>;
  insights: Insight[];
  recomendacoes: Recomendacao[];
  metas: MetaComProgresso[];
  rendaInformada: number | null;
  totalPlanejado: number;
  naoAlocado: number | null;
  coberturaClassificacao: number;
  nomeFamilia: string;
  /** Fase 12 (Auditoria V2) — vazio quando o módulo benchmark_externo não está elegível, ou nenhuma categoria tem mapeamento/dado disponível. */
  comparacoesExternas: ComparacaoExterna[];
}

function pctTexto(valor: number, total: number): string {
  return total !== 0 ? `${Math.round((valor / total) * 100)}%` : "0%";
}

/**
 * Monta o bloco de fatos enviado à API E a lista de valores monetários/percentuais
 * "conhecidos" — a mesma passagem que formata um valor pro prompt também o
 * registra como legítimo, garantindo que a validação pós-geração (Fase 10)
 * nunca discorde do que foi de fato enviado. Nunca inclui `quebraPorObjetivo`
 * (mesma barreira de privacidade já aplicada ao Consultor/Narrador — a
 * distribuição por pessoa nunca vai pra API em texto livre).
 */
function montarBlocoDados(dados: DadosNarrador): { texto: string; valoresConhecidos: string[] } {
  const conhecidos: string[] = [];
  const v = (s: string): string => {
    conhecidos.push(s);
    return s;
  };
  // Insights/recomendações já são fatos existentes (não gerados agora) — todo
  // número que já aparece neles é legítimo, mesmo que o narrador só o repita.
  for (const i of dados.insights) conhecidos.push(...extrairValoresCitados(i.explicacao));
  for (const r of dados.recomendacoes) conhecidos.push(...extrairValoresCitados(r.texto));

  const { totalConsolidado, totalLancamentos, quebraPorCategoria, maioresDespesas } = dados.dadosCongelados;

  const quebraPorCategoriaTexto =
    Object.entries(quebraPorCategoria)
      .map(([id, valor]) => `- ${dados.categoriaRotulos.get(id) ?? "categoria desconhecida"}: ${v(formatBRL(valor))} (${v(pctTexto(valor, totalConsolidado))})`)
      .join("\n") || "Nenhuma categoria registrada.";

  const maioresDespesasTexto =
    maioresDespesas.map((d) => `- ${d.fornecedor}: ${v(formatBRL(d.valor))}`).join("\n") || "Nenhum lançamento registrado.";

  const insightsTexto = dados.insights.length
    ? dados.insights.map((i) => `- [${i.tipo}] ${i.titulo}: ${i.explicacao} (confiança ${v(`${Math.round(i.confianca * 100)}%`)})`).join("\n")
    : "Nenhum insight de variação relevante foi detectado nesta competência.";

  const recomendacoesTexto = dados.recomendacoes.length
    ? dados.recomendacoes.map((r) => `- [${r.tipo}] ${r.texto}`).join("\n")
    : "Nenhuma recomendação gerada nesta competência.";

  const metasTexto = dados.metas.length
    ? dados.metas
        .map((m) => `- ${m.rotuloCompleto}: gasto ${v(formatBRL(m.gastoAtual))} de ${v(formatBRL(m.valorLimiteEfetivo))} (${v(`${Math.round(m.percentual * 100)}%`)}, status ${m.statusProgresso}).`)
        .join("\n")
    : "Nenhuma meta ativa neste momento.";

  const rendaTexto =
    dados.rendaInformada !== null
      ? `Renda informada: ${v(formatBRL(dados.rendaInformada))}. Total planejado no plano do mês: ${v(formatBRL(dados.totalPlanejado))}.${
          dados.naoAlocado !== null ? ` Não alocado: ${v(formatBRL(dados.naoAlocado))}.` : ""
        }`
      : "Renda não informada neste mês.";

  // Cada `faixaTexto` já é um fato pré-existente (calculado em benchmark.ts,
  // não pelo narrador) — mesmo tratamento de insights/recomendações: os
  // números que já aparecem nele são legítimos, mesmo que o narrador só o repita.
  for (const c of dados.comparacoesExternas) conhecidos.push(...extrairValoresCitados(c.faixaTexto));
  const comparacoesExternasTexto = dados.comparacoesExternas.length
    ? dados.comparacoesExternas
        .map((c) => `- ${dados.categoriaRotulos.get(c.categoriaId) ?? "categoria desconhecida"}: ${c.faixaTexto}`)
        .join("\n")
    : "Nenhuma categoria com mapeamento e dado externo disponível para este período.";

  const texto = `Total consolidado: ${v(formatBRL(totalConsolidado))}
Total de lançamentos: ${totalLancamentos}
Cobertura de revisão: ${v(`${Math.round(dados.coberturaClassificacao * 100)}%`)}

Distribuição por categoria:
${quebraPorCategoriaTexto}

Maiores despesas individuais:
${maioresDespesasTexto}

Insights detectados pelo Agente Analista:
${insightsTexto}

Recomendações do Agente Analista:
${recomendacoesTexto}

Metas ativas:
${metasTexto}

Renda e plano do mês:
${rendaTexto}

Comparação com referências externas (IPCA/IBGE — sempre faixa de referência, nunca "certo/errado"):
${comparacoesExternasTexto}`;

  return { texto, valoresConhecidos: conhecidos };
}

function montarPrompt(mesReferencia: string, modulos: ModuloElegivel[], blocoDadosTexto: string, nomeFamilia: string): string {
  const listaModulos = modulos
    .map((m) => `${MARCADOR_SECAO(m.slug)}\n${m.titulo}: ${DESCRICAO_MODULO[m.slug]}`)
    .join("\n\n");

  return `Você é o Agente Narrador da AURÓR · Hub Financeira — transforma análises financeiras já calculadas em um relatório executivo para a família ${nomeFamilia}, sobre as finanças conjuntas da família.

REGRAS INEGOCIÁVEIS:
- Nunca invente valores, fornecedores, categorias ou eventos que não estejam explicitamente nos dados abaixo. Você só pode interpretar o que foi fornecido.
- Todo valor em reais ou percentual que você citar precisa ser EXATAMENTE um dos valores já fornecidos abaixo (copie a formatação, não recalcule).
- Para qualquer seção sem dado suficiente para uma afirmação específica, escreva um texto curto reconhecendo a limitação (ex.: "ainda não há dados suficientes para X") em vez de inventar conteúdo.
- Nunca mencione nomes de membros específicos da família ou a distribuição de gastos por pessoa — essa informação não foi fornecida a você de propósito e não deve ser citada nem estimada.
- Ao citar qualquer referência externa (IPCA/IBGE, cesta básica, ou qualquer comparação fora dos dados da própria família): use sempre linguagem de faixa/referência ("referência", "faixa", "famílias com perfil semelhante") — NUNCA "certo", "errado" ou "ideal". Nunca trate uma variação de preço como causa comprovada de um gasto da família — no máximo "pode ter contribuído". Toda citação externa deve mencionar fonte, período e região explicitamente (já incluídos no dado fornecido — nunca omita ao citar).
- Responda em texto plano, em português — SEM tags HTML, SEM markdown (sem #, **, _, etc.). Parágrafos separados por uma linha em branco. Itens de lista começam com "- " no início da linha.
- Escreva exatamente as seções abaixo, cada uma iniciada por uma linha idêntica ao marcador indicado (a linha do marcador não deve ter mais nada além do marcador), seguida do texto da seção. Não escreva um título visível — o título já é conhecido pelo marcador.

SEÇÕES A ESCREVER (nesta ordem):

${listaModulos}

DADOS DA COMPETÊNCIA ${formatCompetencia(mesReferencia)}:

${blocoDadosTexto}`;
}

/** Divide a resposta do modelo nas seções delimitadas por `<<<SECAO:slug>>>`. Texto fora de qualquer marcador é descartado. */
function parseSecoes(textoResposta: string, modulos: ModuloElegivel[]): SecaoRelatorio[] {
  const tituloPorSlug = new Map(modulos.map((m) => [m.slug as string, m.titulo]));
  const partes = textoResposta.split(/^<<<SECAO:([a-z_]+)>>>[ \t]*$/m);
  const secoes: SecaoRelatorio[] = [];
  for (let i = 1; i < partes.length; i += 2) {
    const slug = partes[i];
    const corpo = (partes[i + 1] ?? "").trim();
    if (!corpo) continue;
    secoes.push({ slug, titulo: tituloPorSlug.get(slug) ?? slug, corpo });
  }
  return secoes;
}

function escapeHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Converte texto plano (parágrafos por linha em branco, itens "- ") em HTML seguro — nunca confia em tag alguma vinda do modelo, porque não existe mais nenhuma. */
function corpoParaHtml(corpo: string): string {
  const blocos = corpo.split(/\n\s*\n/);
  return blocos
    .map((bloco) => {
      const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
      if (linhas.length > 0 && linhas.every((l) => l.startsWith("- "))) {
        return `<ul>${linhas.map((l) => `<li>${escapeHtml(l.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${escapeHtml(bloco.trim())}</p>`;
    })
    .join("");
}

function montarShellHtml(mesReferencia: string, secoes: SecaoRelatorio[]): string {
  const corpo = secoes.map((s) => `<h2>${escapeHtml(s.titulo)}</h2>${corpoParaHtml(s.corpo)}`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Relatório executivo — ${formatCompetencia(mesReferencia)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1.5rem;line-height:1.6;color:#1c1c1c}h2{margin-top:2rem;border-bottom:1px solid #ddd;padding-bottom:.25rem}table{width:100%;border-collapse:collapse;margin:.5rem 0}td,th{padding:.4rem .6rem;border-bottom:1px solid #eee;text-align:left}</style>
</head><body>${corpo}</body></html>`;
}

/** Distribuição por objetivo — nunca enviada à API (privacidade), montada só por código e anexada à seção de Composição. */
function montarAnexoObjetivos(dadosCongelados: DadosCongelados, objetivoRotulos: Map<string, string>): string | null {
  const entradas = Object.entries(dadosCongelados.quebraPorObjetivo);
  if (entradas.length === 0) return null;
  const linhas = entradas
    .map(([id, valor]) => `- ${objetivoRotulos.get(id) ?? "—"}: ${formatBRL(valor)} (${pctTexto(valor, dadosCongelados.totalConsolidado)})`)
    .join("\n");
  return `\n\nDistribuição por objetivo:\n${linhas}`;
}

async function chamarModelo(client: Anthropic, prompt: string): Promise<string> {
  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const blocoTexto = resposta.content.find((b) => b.type === "text");
  if (!blocoTexto || blocoTexto.type !== "text" || !blocoTexto.text.trim()) {
    throw new Error("Resposta do Agente Narrador veio vazia.");
  }
  return blocoTexto.text;
}

/**
 * Agente Narrador (Fase 7, reestruturado na Fase 10 — Auditoria V2) — gera o
 * relatório executivo via API da Claude, agora só com os módulos elegíveis
 * (ver orquestrador.ts) em vez de 14 seções fixas sempre pedidas. Texto plano
 * (nunca HTML gerado pelo modelo — `conteudo_html` é montado por código a
 * partir do texto, mesma disciplina de nunca confiar em HTML vindo de IA).
 * Valida os números citados contra o pacote de dados enviado; regenera uma
 * vez em caso de divergência; publica com aviso visível se persistir.
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
  pacote: PacoteDadosRelatorio,
  metas: MetaComProgresso[],
  plano: { totalPlanejado: number; naoAlocado: number | null },
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

  const modulos = selecionarModulos(pacote);

  const comparacoesExternas: ComparacaoExterna[] = [];
  if (modulos.some((m) => m.slug === "benchmark_externo")) {
    for (const categoriaId of idsCategorias) {
      const comparacao = await montarComparacaoExterna(categoriaId, mesReferencia, {
        consentimentoComparacaoExterna: pacote.consentimentoComparacaoExterna,
      });
      if (comparacao) comparacoesExternas.push(comparacao);
    }
  }

  const dadosNarrador: DadosNarrador = {
    dadosCongelados,
    categoriaRotulos: rotulosPorId,
    insights,
    recomendacoes,
    metas,
    rendaInformada: pacote.rendaInformada,
    totalPlanejado: plano.totalPlanejado,
    naoAlocado: plano.naoAlocado,
    coberturaClassificacao: pacote.coberturaClassificacao,
    nomeFamilia,
    comparacoesExternas,
  };
  const { texto: blocoDadosTexto, valoresConhecidos } = montarBlocoDados(dadosNarrador);
  const prompt = montarPrompt(mesReferencia, modulos, blocoDadosTexto, nomeFamilia);

  const client = new Anthropic({ apiKey });

  let textoResposta = await chamarModelo(client, prompt);
  let validacao = validarRelatorio(textoResposta, valoresConhecidos);
  if (!validacao.valido) {
    textoResposta = await chamarModelo(client, prompt);
    validacao = validarRelatorio(textoResposta, valoresConhecidos);
  }

  let secoes = parseSecoes(textoResposta, modulos);
  if (secoes.length === 0) throw new Error("Agente Narrador não produziu nenhuma seção reconhecível.");

  const anexoObjetivos = montarAnexoObjetivos(dadosCongelados, rotulosPorId);
  if (anexoObjetivos) {
    secoes = secoes.map((s) => (s.slug === "composicao" ? { ...s, corpo: `${s.corpo}${anexoObjetivos}` } : s));
  }

  if (!validacao.valido) {
    secoes = [
      {
        slug: "aviso_revisao",
        titulo: "Aviso de revisão automática",
        corpo:
          "A revisão automática deste relatório encontrou uma divergência entre números citados e os dados enviados, mesmo após uma nova tentativa de geração. Os valores abaixo podem não estar 100% consistentes com o pacote de dados — revise com atenção antes de decidir a partir deles.",
      },
      ...secoes,
    ];
  }

  const htmlFinal = montarShellHtml(mesReferencia, secoes);

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
    secoes_estruturadas: secoes,
    metodologia: `Motor analítico determinístico + Agente Narrador via API da Claude (${MODELO}, ${VERSAO_NARRADOR}) — módulos selecionados por elegibilidade estrutural (${modulos.map((m) => m.slug).join(", ")}). Distribuição por objetivo gerada por código, não narrada por IA.`,
    insights_utilizados: insights.map((i) => i.id),
  });
  if (errVersao) throw new Error("Falha ao gravar versão do relatório: " + errVersao.message);
}
