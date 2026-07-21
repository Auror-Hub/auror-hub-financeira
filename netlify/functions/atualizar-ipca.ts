import { createClient } from "@supabase/supabase-js";

/**
 * Fase 12 (Auditoria V2): primeira infra de job agendado do projeto — ver
 * ADR-010. Busca o IPCA (IBGE/SIDRA, tabela 7060 — variação mensal e
 * acumulada em 12 meses, índice geral + 9 grupos) e grava em
 * `indices_precos` via upsert (nunca duplica por período). Roda com a
 * service role — a única rotina deste projeto que ignora RLS de propósito,
 * porque `indices_precos` é referência global, não dado de uma família.
 *
 * DIEESE (cesta básica) não tem API pública estável — fica de fora deste
 * job, é entrada manual (ver PerfilFinanceiroSection.tsx). POF é pesquisa
 * estática (2017-2018), importada uma vez via SQL Editor, nunca por job.
 */

const TABELA_SIDRA = "7060";
const VARIAVEL_MENSAL = "63";
const VARIAVEL_12M = "2265";

/** Códigos da classificação "Geral, grupo, subgrupo, item e subitem" (c315) — índice geral + os 9 grupos de nível 1. */
const CATEGORIAS_IBGE: Record<string, string> = {
  "7169": "geral",
  "7170": "alimentacao_bebidas",
  "7445": "habitacao",
  "7486": "artigos_residencia",
  "7558": "vestuario",
  "7625": "transportes",
  "7660": "saude_cuidados_pessoais",
  "7712": "despesas_pessoais",
  "7766": "educacao",
  "7786": "comunicacao",
};

interface LinhaSidra {
  V: string;
  D2C: string;
  D3C: string;
  D4C: string;
}

export interface RegistroIndicePreco {
  fonte: string;
  categoria_ibge: string;
  regiao: string;
  periodo_referencia: string;
  variacao_mensal: number | null;
  variacao_12m: number | null;
}

function parseValorSidra(bruto: string): number | null {
  const numero = Number(bruto.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/** "202606" -> "2026-06". */
function formatarPeriodo(codigoAnoMes: string): string {
  return `${codigoAnoMes.slice(0, 4)}-${codigoAnoMes.slice(4, 6)}`;
}

/**
 * Puro, sem I/O — agrupa as linhas brutas do SIDRA (uma linha por variável)
 * num registro por categoria/período, pronto pra upsert. Exportado só pra
 * teste; nunca inventa uma categoria fora do mapa conhecido.
 */
export function montarRegistros(linhas: LinhaSidra[]): RegistroIndicePreco[] {
  const porChave = new Map<string, RegistroIndicePreco>();

  for (const linha of linhas) {
    const categoriaIbge = CATEGORIAS_IBGE[linha.D4C];
    if (!categoriaIbge) continue;

    const periodo = formatarPeriodo(linha.D3C);
    const chave = `${categoriaIbge}|${periodo}`;
    const registro =
      porChave.get(chave) ??
      ({
        fonte: "IBGE-SIDRA-7060",
        categoria_ibge: categoriaIbge,
        regiao: "Brasil",
        periodo_referencia: periodo,
        variacao_mensal: null,
        variacao_12m: null,
      } satisfies RegistroIndicePreco);

    const valor = parseValorSidra(linha.V);
    if (linha.D2C === VARIAVEL_MENSAL) registro.variacao_mensal = valor;
    if (linha.D2C === VARIAVEL_12M) registro.variacao_12m = valor;
    porChave.set(chave, registro);
  }

  return [...porChave.values()];
}

async function buscarDadosSidra(): Promise<LinhaSidra[]> {
  const categorias = Object.keys(CATEGORIAS_IBGE).join(",");
  const url = `https://apisidra.ibge.gov.br/values/t/${TABELA_SIDRA}/n1/1/v/${VARIAVEL_MENSAL},${VARIAVEL_12M}/p/last%201/c315/${categorias}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`SIDRA respondeu ${resposta.status} ${resposta.statusText}`);
  const linhas = (await resposta.json()) as LinhaSidra[];
  // A primeira linha do array SIDRA é sempre o cabeçalho de metadados (D1N: "Nível Territorial" etc.), nunca um dado.
  return linhas.slice(1);
}

async function atualizarIpca(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas.", { status: 500 });
  }

  try {
    const linhas = await buscarDadosSidra();
    const registros = montarRegistros(linhas);
    if (registros.length === 0) {
      return new Response("Nenhum registro retornado pelo SIDRA — nada foi gravado.", { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("indices_precos")
      .upsert(registros, { onConflict: "fonte,categoria_ibge,regiao,periodo_referencia" });
    if (error) throw new Error("Falha ao gravar indices_precos: " + error.message);

    return new Response(`Atualizado: ${registros.length} categorias, período ${registros[0].periodo_referencia}.`, { status: 200 });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
    console.error("atualizar-ipca:", mensagem);
    return new Response(mensagem, { status: 500 });
  }
}

export default atualizarIpca;

/** Netlify Scheduled Functions — sintaxe cron, sem depender de netlify.toml. Todo dia 1 às 06:00 UTC (IPCA do IBGE costuma saltar publicado por volta do dia 10). */
export const config: { schedule: string } = { schedule: "0 6 1 * *" };
