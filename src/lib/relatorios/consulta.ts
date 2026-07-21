import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { SecaoRelatorio } from "./narrador";

export type StatusRelatorioVersao = "vigente" | "superseded";

export interface RelatorioResumo {
  versaoId: string;
  competenciaId: string;
  mesReferencia: string;
  versao: number;
  status: StatusRelatorioVersao;
  criadoEm: string;
}

/** Lista as versões vigentes de relatório (uma por competência), mais recentes primeiro — para SCR-REPORT-LIST-001. */
export async function carregarRelatorios(): Promise<RelatorioResumo[]> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: versoesRaw, error: errVersoes } = await supabase
    .from("relatorio_versoes")
    .select("id, relatorio_id, versao, status, criado_em")
    .eq("status", "vigente")
    .order("criado_em", { ascending: false });
  if (errVersoes) throw new Error("Falha ao carregar relatórios: " + errVersoes.message);
  const versoes = versoesRaw ?? [];
  if (versoes.length === 0) return [];

  const idsRelatorios = versoes.map((v) => v.relatorio_id as string);
  const { data: relatoriosRaw, error: errRelatorios } = await supabase
    .from("relatorios")
    .select("id, competencia_id")
    .in("id", idsRelatorios);
  if (errRelatorios) throw new Error("Falha ao carregar relatórios: " + errRelatorios.message);
  const competenciaIdPorRelatorio = new Map((relatoriosRaw ?? []).map((r) => [r.id as string, r.competencia_id as string]));

  const idsCompetencias = Array.from(new Set(Array.from(competenciaIdPorRelatorio.values())));
  const { data: competenciasRaw, error: errCompetencias } = await supabase
    .from("competencias")
    .select("id, mes_referencia")
    .in("id", idsCompetencias.length > 0 ? idsCompetencias : ["00000000-0000-0000-0000-000000000000"]);
  if (errCompetencias) throw new Error("Falha ao carregar competências: " + errCompetencias.message);
  const mesPorCompetencia = new Map((competenciasRaw ?? []).map((c) => [c.id as string, c.mes_referencia as string]));

  return versoes
    .map((v) => {
      const competenciaId = competenciaIdPorRelatorio.get(v.relatorio_id as string);
      const mesReferencia = competenciaId ? mesPorCompetencia.get(competenciaId) : undefined;
      if (!competenciaId || !mesReferencia) return null;
      return {
        versaoId: v.id as string,
        competenciaId,
        mesReferencia,
        versao: v.versao as number,
        status: v.status as StatusRelatorioVersao,
        criadoEm: v.criado_em as string,
      };
    })
    .filter((r): r is RelatorioResumo => r !== null);
}

export interface RelatorioVersaoDetalhe extends RelatorioResumo {
  conteudoHtml: string;
  /** Fase 10 (Auditoria V2) — null para relatórios gerados antes desta fase (fallback pro iframe com `conteudoHtml`). */
  secoesEstruturadas: SecaoRelatorio[] | null;
  metodologia: string;
}

/** Conteúdo completo de uma versão de relatório — para SCR-REPORT-DETAIL-001. */
export async function carregarRelatorioVersao(versaoId: string): Promise<RelatorioVersaoDetalhe | undefined> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: versao, error: errVersao } = await supabase
    .from("relatorio_versoes")
    .select("id, relatorio_id, versao, status, conteudo_html, secoes_estruturadas, metodologia, criado_em")
    .eq("id", versaoId)
    .maybeSingle();
  if (errVersao) throw new Error("Falha ao carregar versão do relatório: " + errVersao.message);
  if (!versao) return undefined;

  const { data: relatorio } = await supabase
    .from("relatorios")
    .select("competencia_id")
    .eq("id", versao.relatorio_id as string)
    .maybeSingle();
  if (!relatorio) return undefined;

  const { data: competencia } = await supabase
    .from("competencias")
    .select("mes_referencia")
    .eq("id", relatorio.competencia_id as string)
    .maybeSingle();
  if (!competencia) return undefined;

  return {
    versaoId: versao.id as string,
    competenciaId: relatorio.competencia_id as string,
    mesReferencia: competencia.mes_referencia as string,
    versao: versao.versao as number,
    status: versao.status as StatusRelatorioVersao,
    conteudoHtml: versao.conteudo_html as string,
    secoesEstruturadas: (versao.secoes_estruturadas as SecaoRelatorio[] | null) ?? null,
    metodologia: versao.metodologia as string,
    criadoEm: versao.criado_em as string,
  };
}

/** Id da versão vigente de relatório de uma competência, se houver — usado pelo card "Relatório" em CompetencyDetailScreen. */
export async function carregarVersaoVigentePorCompetencia(competenciaId: string): Promise<string | undefined> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: relatorio } = await supabase.from("relatorios").select("id").eq("competencia_id", competenciaId).maybeSingle();
  if (!relatorio) return undefined;

  const { data: versao } = await supabase
    .from("relatorio_versoes")
    .select("id")
    .eq("relatorio_id", relatorio.id as string)
    .eq("status", "vigente")
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (versao?.id as string | undefined) ?? undefined;
}
