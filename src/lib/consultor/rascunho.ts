import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import { carregarMetas } from "@/lib/metas/consulta";
import { formatBRL, formatData } from "@/lib/format";
import type { IntencaoEstruturada } from "./interpretar";

/**
 * Rearquitetura (Fase 4, ADR-007): Consultor com ferramentas — as 4
 * intenções de mutação nunca executam nada aqui, só preparam um RASCUNHO com
 * todos os ids já resolvidos (nunca rótulo cru) pra confirmação explícita no
 * chat. Retorna null sempre que faltar dado suficiente pra montar um
 * rascunho seguro — nunca adivinha (ex.: lançamento ambíguo, meta
 * inexistente) — vira resposta de limitação, mesma disciplina do resto do
 * Consultor.
 */
export type RascunhoAcao =
  | {
      tipo: "criar_meta";
      resumo: string;
      params: {
        tipoMeta: "limite_absoluto" | "reducao_percentual";
        categoriaId: string | null;
        categoriaRotulo: string;
        subcategoriaId: string | null;
        subcategoriaRotulo: string | null;
        objetivoId: string | null;
        objetivoRotulo: string | null;
        valorLimiteReais: number | null;
        percentualAlvo: number | null;
        periodoMeses: number | null;
      };
    }
  | {
      tipo: "ajustar_meta";
      resumo: string;
      params: {
        metaId: string;
        categoriaId: string | null;
        subcategoriaId: string | null;
        objetivoId: string | null;
        categoriaRotulo: string;
        valorAtualReais: number;
        novoValorReais: number;
      };
    }
  | {
      tipo: "criar_provisorio";
      resumo: string;
      params: {
        descricaoUsuario: string;
        valorReais: number;
        dataOcorrencia: string;
        fornecedorDica: string | null;
        categoriaId: string | null;
        categoriaRotulo: string | null;
        objetivoId: string | null;
        objetivoRotulo: string | null;
      };
    }
  | {
      tipo: "corrigir_classificacao";
      resumo: string;
      params: {
        lancamentoId: string;
        fornecedorOriginal: string;
        data: string;
        valorReais: number;
        novaCategoriaId: string;
        novaCategoriaRotulo: string;
        novaSubcategoriaId: string | null;
        novaSubcategoriaRotulo: string | null;
        novoObjetivoId: string;
        novoObjetivoRotulo: string;
      };
    };

type SupabaseServer = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

async function resolverTermo(supabase: SupabaseServer, dimensao: "categoria" | "subcategoria" | "objetivo", rotulo: string): Promise<string | null> {
  const { data } = await supabase.from("taxonomia_termos").select("id").eq("dimensao", dimensao).eq("rotulo", rotulo).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

function deslocarDias(dataIso: string, dias: number): string {
  const d = new Date(dataIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function prepararCriarMeta(supabase: SupabaseServer, intencao: IntencaoEstruturada): Promise<RascunhoAcao | null> {
  const tipoMeta = intencao.tipoMeta ?? "limite_absoluto";

  const categoriaId = intencao.categoriaRotulo ? await resolverTermo(supabase, "categoria", intencao.categoriaRotulo) : null;
  if (intencao.categoriaRotulo && !categoriaId) return null;
  const subcategoriaId = intencao.subcategoriaRotulo ? await resolverTermo(supabase, "subcategoria", intencao.subcategoriaRotulo) : null;
  if (intencao.subcategoriaRotulo && !subcategoriaId) return null;
  const objetivoId = intencao.objetivoRotulo ? await resolverTermo(supabase, "objetivo", intencao.objetivoRotulo) : null;
  if (intencao.objetivoRotulo && !objetivoId) return null;

  if (tipoMeta === "limite_absoluto") {
    if (!intencao.valorLimiteReais || intencao.valorLimiteReais <= 0) return null;
  } else {
    if (!intencao.percentualAlvo || intencao.percentualAlvo <= 0 || intencao.percentualAlvo >= 100) return null;
    if (!intencao.periodoMeses || ![1, 3, 6, 12].includes(intencao.periodoMeses)) return null;
  }

  const categoriaRotulo = intencao.categoriaRotulo ?? "Orçamento geral";
  const partesResumo = [categoriaRotulo, intencao.subcategoriaRotulo, intencao.objetivoRotulo].filter((p): p is string => Boolean(p));
  const alvoResumo =
    tipoMeta === "limite_absoluto"
      ? formatBRL(Math.round(intencao.valorLimiteReais! * 100))
      : `redução de ${intencao.percentualAlvo}% vs. últimos ${intencao.periodoMeses} meses`;

  return {
    tipo: "criar_meta",
    resumo: `Meta de ${partesResumo.join(" · ")} — ${alvoResumo}`,
    params: {
      tipoMeta,
      categoriaId,
      categoriaRotulo,
      subcategoriaId,
      subcategoriaRotulo: intencao.subcategoriaRotulo ?? null,
      objetivoId,
      objetivoRotulo: intencao.objetivoRotulo ?? null,
      valorLimiteReais: tipoMeta === "limite_absoluto" ? intencao.valorLimiteReais! : null,
      percentualAlvo: tipoMeta === "reducao_percentual" ? intencao.percentualAlvo! : null,
      periodoMeses: tipoMeta === "reducao_percentual" ? intencao.periodoMeses! : null,
    },
  };
}

async function prepararAjustarMeta(intencao: IntencaoEstruturada): Promise<RascunhoAcao | null> {
  if (!intencao.valorLimiteReais || intencao.valorLimiteReais <= 0) return null;

  const metas = await carregarMetas();
  const ativasLimiteFixo = metas.filter((m) => m.status === "ativa" && m.tipo === "limite_absoluto");
  const alvo = intencao.categoriaRotulo
    ? ativasLimiteFixo.find((m) => m.rotuloCompleto.split(" · ")[0] === intencao.categoriaRotulo)
    : ativasLimiteFixo.find((m) => m.categoriaId === null);
  // Nunca adivinha qual meta ajustar — sem encontrar exatamente uma, vira limitação.
  if (!alvo) return null;

  return {
    tipo: "ajustar_meta",
    resumo: `Ajustar meta "${alvo.rotuloCompleto}" de ${formatBRL(alvo.valorLimiteEfetivo)} para ${formatBRL(Math.round(intencao.valorLimiteReais * 100))}`,
    params: {
      metaId: alvo.id,
      categoriaId: alvo.categoriaId,
      subcategoriaId: alvo.subcategoriaId,
      objetivoId: alvo.objetivoId,
      categoriaRotulo: alvo.rotuloCompleto,
      valorAtualReais: alvo.valorLimiteEfetivo / 100,
      novoValorReais: intencao.valorLimiteReais,
    },
  };
}

async function prepararProvisorio(supabase: SupabaseServer, intencao: IntencaoEstruturada): Promise<RascunhoAcao | null> {
  if (!intencao.descricaoUsuario || !intencao.valorReais || intencao.valorReais <= 0 || !intencao.dataOcorrencia) return null;

  const categoriaId = intencao.categoriaRotulo ? await resolverTermo(supabase, "categoria", intencao.categoriaRotulo) : null;
  if (intencao.categoriaRotulo && !categoriaId) return null;
  const objetivoId = intencao.objetivoRotulo ? await resolverTermo(supabase, "objetivo", intencao.objetivoRotulo) : null;
  if (intencao.objetivoRotulo && !objetivoId) return null;

  return {
    tipo: "criar_provisorio",
    resumo: `${intencao.descricaoUsuario} — ${formatBRL(Math.round(intencao.valorReais * 100))} em ${formatData(intencao.dataOcorrencia)}`,
    params: {
      descricaoUsuario: intencao.descricaoUsuario,
      valorReais: intencao.valorReais,
      dataOcorrencia: intencao.dataOcorrencia,
      fornecedorDica: intencao.fornecedorTexto ?? null,
      categoriaId,
      categoriaRotulo: intencao.categoriaRotulo ?? null,
      objetivoId,
      objetivoRotulo: intencao.objetivoRotulo ?? null,
    },
  };
}

async function prepararCorrecao(supabase: SupabaseServer, perfilId: string, intencao: IntencaoEstruturada): Promise<RascunhoAcao | null> {
  if (!intencao.fornecedorTexto || !intencao.novaCategoriaRotulo) return null;

  const novaCategoriaId = await resolverTermo(supabase, "categoria", intencao.novaCategoriaRotulo);
  if (!novaCategoriaId) return null;
  const novaSubcategoriaId = intencao.novaSubcategoriaRotulo ? await resolverTermo(supabase, "subcategoria", intencao.novaSubcategoriaRotulo) : null;
  if (intencao.novaSubcategoriaRotulo && !novaSubcategoriaId) return null;
  const objetivoMencionadoId = intencao.novoObjetivoRotulo ? await resolverTermo(supabase, "objetivo", intencao.novoObjetivoRotulo) : null;
  if (intencao.novoObjetivoRotulo && !objetivoMencionadoId) return null;

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);
  if (cartaoIds.length === 0) return null;

  let query = supabase
    .from("lancamentos_brutos")
    .select("id, fornecedor_original, data, valor")
    .in("cartao_id", cartaoIds)
    .ilike("fornecedor_original", `%${intencao.fornecedorTexto}%`);
  if (intencao.dataAproximada) {
    query = query.gte("data", deslocarDias(intencao.dataAproximada, -3)).lte("data", deslocarDias(intencao.dataAproximada, 3));
  }
  const { data: candidatosRaw } = await query;
  const inativos = await carregarIdsInativos(supabase, perfilId);
  const candidatos = (candidatosRaw ?? []).filter((l) => !inativos.has(l.id as string));
  // Ambíguo (0 ou 2+ candidatos) — nunca adivinha qual lançamento corrigir.
  if (candidatos.length !== 1) return null;
  const lancamento = candidatos[0];

  // corrigirClassificacao exige objetivo — se não foi mencionado, reaproveita
  // o da decisão vigente (se houver); sem nenhum dos dois, não monta rascunho.
  let objetivoIdFinal = objetivoMencionadoId;
  if (!objetivoIdFinal) {
    const { data: decisaoVigente } = await supabase
      .from("classificacao_decisoes")
      .select("objetivo_id")
      .eq("lancamento_id", lancamento.id)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    objetivoIdFinal = (decisaoVigente?.objetivo_id as string | undefined) ?? null;
  }
  if (!objetivoIdFinal) return null;

  const { data: objetivoTermo } = await supabase.from("taxonomia_termos").select("rotulo").eq("id", objetivoIdFinal).maybeSingle();
  const objetivoRotuloFinal = (objetivoTermo?.rotulo as string | undefined) ?? "—";

  return {
    tipo: "corrigir_classificacao",
    resumo: `${lancamento.fornecedor_original} (${formatData(lancamento.data as string)}, ${formatBRL(Math.abs(lancamento.valor as number))}) → ${intencao.novaCategoriaRotulo}${intencao.novaSubcategoriaRotulo ? " · " + intencao.novaSubcategoriaRotulo : ""}`,
    params: {
      lancamentoId: lancamento.id as string,
      fornecedorOriginal: lancamento.fornecedor_original as string,
      data: lancamento.data as string,
      valorReais: Math.abs(lancamento.valor as number) / 100,
      novaCategoriaId,
      novaCategoriaRotulo: intencao.novaCategoriaRotulo,
      novaSubcategoriaId,
      novaSubcategoriaRotulo: intencao.novaSubcategoriaRotulo ?? null,
      novoObjetivoId: objetivoIdFinal,
      novoObjetivoRotulo: objetivoRotuloFinal,
    },
  };
}

export async function prepararRascunho(intencao: IntencaoEstruturada): Promise<RascunhoAcao | null> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  switch (intencao.intencao) {
    case "criar_rascunho_meta":
      return prepararCriarMeta(supabase, intencao);
    case "criar_rascunho_ajuste_plano":
      return prepararAjustarMeta(intencao);
    case "criar_lancamento_provisorio":
      return prepararProvisorio(supabase, intencao);
    case "criar_rascunho_correcao_classificacao":
      return prepararCorrecao(supabase, perfilId, intencao);
    default:
      return null;
  }
}
