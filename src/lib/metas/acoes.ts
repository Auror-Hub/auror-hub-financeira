"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

function revalidarMetas(): void {
  revalidatePath("/metas");
  revalidatePath("/");
}

interface CamposMeta {
  categoriaId: string | null;
  valorLimiteCentavos: number;
}

function lerCampos(formData: FormData): CamposMeta {
  const categoriaId = String(formData.get("categoriaId") ?? "").trim() || null;
  const valorReais = Number(formData.get("valorLimite") ?? "");
  if (!Number.isFinite(valorReais) || valorReais <= 0) throw new Error("Informe um valor de limite válido, maior que zero.");
  return { categoriaId, valorLimiteCentavos: Math.round(valorReais * 100) };
}

/** Cria uma meta ativa (por categoria ou geral). Checa duplicidade antes de deixar o índice único do banco estourar. */
export async function criarMeta(formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const { categoriaId, valorLimiteCentavos } = lerCampos(formData);

  let query = supabase.from("metas").select("id").eq("perfil_id", perfilId).eq("status", "ativa");
  query = categoriaId ? query.eq("categoria_id", categoriaId) : query.is("categoria_id", null);
  const { data: existente } = await query.maybeSingle();
  if (existente) {
    throw new Error(
      categoriaId
        ? "Já existe uma meta ativa para esta categoria — desative-a antes de criar outra."
        : "Já existe um orçamento geral ativo — desative-o antes de criar outro.",
    );
  }

  const { error } = await supabase
    .from("metas")
    .insert({ perfil_id: perfilId, categoria_id: categoriaId, valor_limite: valorLimiteCentavos, status: "ativa" });
  if (error) throw new Error("Falha ao criar meta: " + error.message);

  revalidarMetas();
}

/** Edita = desativa a meta antiga e cria uma nova com os valores atualizados (conteúdo é imutável — ver ADR-006). */
export async function editarMeta(metaId: string, formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const { categoriaId, valorLimiteCentavos } = lerCampos(formData);

  const { data: meta, error: errBusca } = await supabase.from("metas").select("id, status").eq("id", metaId).single();
  if (errBusca || !meta) throw new Error("Meta não encontrada.");
  if (meta.status !== "ativa") throw new Error("Só é possível editar uma meta ativa.");

  const { error: errDesativar } = await supabase.from("metas").update({ status: "inativa" }).eq("id", metaId);
  if (errDesativar) throw new Error("Falha ao desativar a meta antiga: " + errDesativar.message);

  const { error: errCriar } = await supabase
    .from("metas")
    .insert({ perfil_id: perfilId, categoria_id: categoriaId, valor_limite: valorLimiteCentavos, status: "ativa" });
  if (errCriar) throw new Error("Falha ao criar a nova versão da meta: " + errCriar.message);

  revalidarMetas();
}

/** Desativa uma meta ativa. */
export async function desativarMeta(metaId: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: meta, error } = await supabase.from("metas").select("id, status").eq("id", metaId).single();
  if (error || !meta) throw new Error("Meta não encontrada.");
  if (meta.status === "inativa") return;

  const { error: errUpdate } = await supabase.from("metas").update({ status: "inativa" }).eq("id", metaId);
  if (errUpdate) throw new Error("Falha ao desativar meta: " + errUpdate.message);

  revalidarMetas();
}
