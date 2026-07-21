"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { Supabase } from "@/lib/competencias/reabertura";
import { validarLinhasPlano, type LinhaPlanoInput, type NaturezaPlano } from "./validacao";

const NATUREZAS_VALIDAS: readonly NaturezaPlano[] = ["comprometido", "protegido", "ajustavel", "reserva"];

async function obterOuCriarPlano(supabase: Supabase, perfilId: string, mesReferencia: string): Promise<string> {
  const { data: existente, error: errBusca } = await supabase
    .from("planos_mensais")
    .select("id")
    .eq("perfil_id", perfilId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();
  if (errBusca) throw new Error("Falha ao verificar plano existente: " + errBusca.message);
  if (existente) return existente.id as string;

  const { data: novo, error: errCriar } = await supabase
    .from("planos_mensais")
    .insert({ perfil_id: perfilId, mes_referencia: mesReferencia })
    .select("id")
    .single();
  if (errCriar || !novo) throw new Error("Falha ao criar plano mensal: " + (errCriar?.message ?? "erro desconhecido"));
  return novo.id as string;
}

function lerLinhasDoFormData(formData: FormData): LinhaPlanoInput[] {
  const raw = formData.get("linhas");
  if (typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Formato inválido nas linhas do plano.");
  }
  if (!Array.isArray(parsed)) throw new Error("Formato inválido nas linhas do plano.");
  return parsed.map((item) => {
    const linha = item as { categoriaId?: string | null; valorPlanejado?: number; natureza?: string };
    if (!NATUREZAS_VALIDAS.includes(linha.natureza as NaturezaPlano)) {
      throw new Error(`Natureza inválida: ${linha.natureza}`);
    }
    return {
      categoriaId: linha.categoriaId ?? null,
      valorPlanejado: Math.round(Number(linha.valorPlanejado)),
      natureza: linha.natureza as NaturezaPlano,
    };
  });
}

/**
 * Fase 8 (Auditoria V2): substitui o conjunto de linhas do plano do mês por
 * completo — mais simples do que reconciliar diffs, e seguro porque o
 * trigger `plano_linhas_bloqueia_apos_fechamento` faz o DELETE falhar (e a
 * escrita inteira abortar) se a competência do mês já fechou.
 */
export async function criarOuAtualizarPlano(mesReferencia: string, formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const linhas = lerLinhasDoFormData(formData);
  const erroValidacao = validarLinhasPlano(linhas);
  if (erroValidacao) throw new Error(erroValidacao);

  const planoId = await obterOuCriarPlano(supabase, perfilId, mesReferencia);

  const { error: errDelete } = await supabase.from("plano_linhas").delete().eq("plano_mensal_id", planoId);
  if (errDelete) throw new Error("Falha ao atualizar plano — " + errDelete.message);

  if (linhas.length > 0) {
    const { error: errInsert } = await supabase.from("plano_linhas").insert(
      linhas.map((l) => ({
        plano_mensal_id: planoId,
        categoria_id: l.categoriaId,
        valor_planejado: l.valorPlanejado,
        natureza: l.natureza,
      })),
    );
    if (errInsert) throw new Error("Falha ao salvar linhas do plano: " + errInsert.message);
  }

  revalidatePath("/meu-plano");
  revalidatePath("/");
}

/** Renda é sempre opcional — nunca bloqueia o uso do plano sem ela. */
export async function informarRenda(mesReferencia: string, valorReais: number | null): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const planoId = await obterOuCriarPlano(supabase, perfilId, mesReferencia);
  const rendaInformada = valorReais !== null ? Math.round(valorReais * 100) : null;

  const { error } = await supabase.from("planos_mensais").update({ renda_informada: rendaInformada }).eq("id", planoId);
  if (error) throw new Error("Falha ao salvar renda informada: " + error.message);

  revalidatePath("/meu-plano");
  revalidatePath("/");
}

/**
 * Nudge pós-fechamento (Fase 2, estendido na Fase 8): copia as linhas (e a
 * renda, se informada) do plano do mês anterior pro mês atual — proposta
 * editável, nunca criada silenciosamente sem essa ação explícita.
 */
export async function copiarPlanoDoMesAnterior(mesReferencia: string, mesAnterior: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: planoAnterior, error: errAnterior } = await supabase
    .from("planos_mensais")
    .select("id, renda_informada")
    .eq("perfil_id", perfilId)
    .eq("mes_referencia", mesAnterior)
    .maybeSingle();
  if (errAnterior) throw new Error("Falha ao carregar plano anterior: " + errAnterior.message);
  if (!planoAnterior) throw new Error("Não há plano no mês anterior para copiar.");

  const { data: linhasAnteriores, error: errLinhas } = await supabase
    .from("plano_linhas")
    .select("categoria_id, valor_planejado, natureza")
    .eq("plano_mensal_id", planoAnterior.id);
  if (errLinhas) throw new Error("Falha ao carregar linhas do plano anterior: " + errLinhas.message);

  const planoId = await obterOuCriarPlano(supabase, perfilId, mesReferencia);

  if ((linhasAnteriores ?? []).length > 0) {
    const { error: errInsert } = await supabase.from("plano_linhas").insert(
      (linhasAnteriores ?? []).map((l) => ({
        plano_mensal_id: planoId,
        categoria_id: l.categoria_id,
        valor_planejado: l.valor_planejado,
        natureza: l.natureza,
      })),
    );
    if (errInsert) throw new Error("Falha ao copiar linhas do plano: " + errInsert.message);
  }

  if (planoAnterior.renda_informada !== null) {
    const { error: errRenda } = await supabase
      .from("planos_mensais")
      .update({ renda_informada: planoAnterior.renda_informada })
      .eq("id", planoId);
    if (errRenda) throw new Error("Falha ao copiar renda do plano anterior: " + errRenda.message);
  }

  revalidatePath("/meu-plano");
  revalidatePath("/");
}
