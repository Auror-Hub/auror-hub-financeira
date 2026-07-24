"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarAmostraDaRegra as carregarAmostraDaRegraConsulta, type AmostraRegra } from "@/lib/regras/consulta";

type Supabase = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

/** RUL-13: se duas+ regras ativas casam o mesmo fornecedor com consequências diferentes, nenhuma se aplica em silêncio — ambas viram 'conflitante'. */
async function verificarEAtualizarConflitos(supabase: Supabase, perfilId: string, fornecedorTexto: string): Promise<void> {
  const { data: regrasAtivas } = await supabase.from("regras").select("id").eq("perfil_id", perfilId).eq("status", "ativa");
  const ids = (regrasAtivas ?? []).map((r) => r.id as string);
  if (ids.length === 0) return;

  const { data: condicoes } = await supabase
    .from("regra_condicoes")
    .select("regra_id, valor_condicao")
    .in("regra_id", ids)
    .eq("tipo", "fornecedor_contem");
  const idsComMesmoFornecedor = (condicoes ?? [])
    .filter((c) => ((c.valor_condicao as { texto?: string } | null)?.texto ?? "").trim().toUpperCase() === fornecedorTexto)
    .map((c) => c.regra_id as string);
  if (idsComMesmoFornecedor.length < 2) return;

  const { data: consequencias } = await supabase
    .from("regra_consequencias")
    .select("regra_id, parametros")
    .in("regra_id", idsComMesmoFornecedor)
    .eq("tipo", "sugerir_classificacao");
  const chaves = new Set(
    (consequencias ?? []).map((c) => {
      const p = c.parametros as { categoriaId?: string; objetivoId?: string | null };
      return `${p.categoriaId ?? ""}|${p.objetivoId ?? ""}`;
    }),
  );
  if (chaves.size > 1) {
    await supabase.from("regras").update({ status: "conflitante" }).in("id", idsComMesmoFornecedor);
  }
}

/** Cria uma regra manual (SCR-RULES-001, botão "Nova regra") — checa conflito com regras ativas antes de deixar ativa. */
export async function criarRegraManual(formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const fornecedorTexto = String(formData.get("fornecedorTexto") ?? "").trim().toUpperCase();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const subcategoriaId = String(formData.get("subcategoriaId") ?? "") || null;
  const objetivoId = String(formData.get("objetivoId") ?? "") || null;
  const confiancaRaw = Number(formData.get("confianca") ?? "0.8");

  if (!fornecedorTexto) throw new Error("Informe um texto de fornecedor.");
  if (!categoriaId) throw new Error("Categoria não pode ficar em branco.");
  const confianca = Number.isFinite(confiancaRaw) ? Math.min(Math.max(confiancaRaw, 0), 1) : 0.8;

  const { data: novaRegra, error: errRegra } = await supabase
    .from("regras")
    .insert({ perfil_id: perfilId, confianca, origem: "manual", status: "ativa" })
    .select()
    .single();
  if (errRegra || !novaRegra) throw new Error("Falha ao criar regra: " + (errRegra?.message ?? "erro desconhecido"));

  const { error: errCondicao } = await supabase
    .from("regra_condicoes")
    .insert({ regra_id: novaRegra.id, tipo: "fornecedor_contem", valor_condicao: { texto: fornecedorTexto } });
  if (errCondicao) throw new Error("Falha ao gravar condição: " + errCondicao.message);

  const { error: errConsequencia } = await supabase
    .from("regra_consequencias")
    .insert({ regra_id: novaRegra.id, tipo: "sugerir_classificacao", parametros: { categoriaId, subcategoriaId, objetivoId } });
  if (errConsequencia) throw new Error("Falha ao gravar consequência: " + errConsequencia.message);

  await verificarEAtualizarConflitos(supabase, perfilId, fornecedorTexto);

  revalidatePath("/regras");
}

/** Aprova uma regra proposta pelo Agente de Aprendizagem (RUL-6: sempre exige aprovação humana). */
export async function aprovarRegra(id: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: regra, error } = await supabase.from("regras").select("id, status").eq("id", id).single();
  if (error || !regra) throw new Error("Regra não encontrada.");
  if (regra.status !== "proposta") throw new Error("Só é possível aprovar uma regra proposta.");

  const { data: condicao } = await supabase
    .from("regra_condicoes")
    .select("valor_condicao")
    .eq("regra_id", id)
    .eq("tipo", "fornecedor_contem")
    .maybeSingle();
  const fornecedorTexto = ((condicao?.valor_condicao as { texto?: string } | null)?.texto ?? "").trim().toUpperCase();

  const { error: errUpdate } = await supabase.from("regras").update({ status: "ativa" }).eq("id", id);
  if (errUpdate) throw new Error("Falha ao aprovar regra: " + errUpdate.message);

  if (fornecedorTexto) await verificarEAtualizarConflitos(supabase, perfilId, fornecedorTexto);

  revalidatePath("/regras");
}

/** Recusa uma regra proposta — não existe status "recusada" no dicionário; a proposta rejeitada vira inativa. */
export async function recusarRegra(id: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: regra, error } = await supabase.from("regras").select("id, status").eq("id", id).single();
  if (error || !regra) throw new Error("Regra não encontrada.");
  if (regra.status !== "proposta") throw new Error("Só é possível recusar uma regra proposta.");

  const { error: errUpdate } = await supabase.from("regras").update({ status: "inativa" }).eq("id", id);
  if (errUpdate) throw new Error("Falha ao recusar regra: " + errUpdate.message);

  revalidatePath("/regras");
}

/** Desativa uma regra ativa ou conflitante — ação manual de resolução de conflito, entre outras. */
export async function desativarRegra(id: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: regra, error } = await supabase.from("regras").select("id, status").eq("id", id).single();
  if (error || !regra) throw new Error("Regra não encontrada.");
  if (regra.status === "inativa") return;

  const { error: errUpdate } = await supabase.from("regras").update({ status: "inativa" }).eq("id", id);
  if (errUpdate) throw new Error("Falha ao desativar regra: " + errUpdate.message);

  revalidatePath("/regras");
}

/** Wrapper "use server" — o Drawer de detalhe (client) chama isso direto para carregar amostra/impacto sob demanda. */
export async function buscarAmostraDaRegra(regraId: string): Promise<AmostraRegra> {
  return carregarAmostraDaRegraConsulta(regraId);
}
