"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { TipoMeta } from "./consulta";

function revalidarMetas(): void {
  revalidatePath("/metas");
  revalidatePath("/meu-plano");
  revalidatePath("/");
}

interface CamposMeta {
  tipo: TipoMeta;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
  valorLimiteCentavos: number | null;
  periodoMeses: number | null;
  percentualAlvo: number | null;
}

function lerCampos(formData: FormData): CamposMeta {
  const tipo = String(formData.get("tipo") ?? "limite_absoluto") as TipoMeta;
  const categoriaId = String(formData.get("categoriaId") ?? "").trim() || null;
  const subcategoriaId = String(formData.get("subcategoriaId") ?? "").trim() || null;
  const objetivoId = String(formData.get("objetivoId") ?? "").trim() || null;

  if (subcategoriaId && !categoriaId) throw new Error("Selecione a categoria antes de escolher a subcategoria.");

  if (tipo === "limite_absoluto") {
    const valorReais = Number(formData.get("valorLimite") ?? "");
    if (!Number.isFinite(valorReais) || valorReais <= 0) throw new Error("Informe um valor de limite válido, maior que zero.");
    return {
      tipo,
      categoriaId,
      subcategoriaId,
      objetivoId,
      valorLimiteCentavos: Math.round(valorReais * 100),
      periodoMeses: null,
      percentualAlvo: null,
    };
  }

  const periodoMeses = Number(formData.get("periodoMeses") ?? "");
  if (![1, 3, 6, 12].includes(periodoMeses)) throw new Error("Selecione o período de comparação (mês anterior, 3, 6 ou 12 meses).");
  const percentualInformado = Number(formData.get("percentualAlvo") ?? "");
  if (!Number.isFinite(percentualInformado) || percentualInformado <= 0 || percentualInformado >= 100) {
    throw new Error("Informe um percentual de redução entre 1 e 99.");
  }
  return {
    tipo,
    categoriaId,
    subcategoriaId,
    objetivoId,
    valorLimiteCentavos: null,
    periodoMeses,
    percentualAlvo: percentualInformado / 100,
  };
}

async function existeMetaAtivaNoMesmoEscopo(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  perfilId: string,
  campos: Pick<CamposMeta, "categoriaId" | "subcategoriaId" | "objetivoId">,
  excluirId?: string,
): Promise<boolean> {
  let query = supabase.from("metas").select("id").eq("perfil_id", perfilId).eq("status", "ativa");
  query = campos.categoriaId ? query.eq("categoria_id", campos.categoriaId) : query.is("categoria_id", null);
  query = campos.subcategoriaId ? query.eq("subcategoria_id", campos.subcategoriaId) : query.is("subcategoria_id", null);
  query = campos.objetivoId ? query.eq("objetivo_id", campos.objetivoId) : query.is("objetivo_id", null);
  if (excluirId) query = query.neq("id", excluirId);
  const { data } = await query.maybeSingle();
  return data !== null;
}

/** Cria uma meta ativa (valor fixo ou redução % — categoria/subcategoria/objetivo opcionais e combináveis). */
export async function criarMeta(formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const campos = lerCampos(formData);

  if (await existeMetaAtivaNoMesmoEscopo(supabase, perfilId, campos)) {
    throw new Error("Já existe uma meta ativa para essa combinação de categoria/subcategoria/objetivo — desative-a antes de criar outra.");
  }

  const { error } = await supabase.from("metas").insert({
    perfil_id: perfilId,
    tipo: campos.tipo,
    categoria_id: campos.categoriaId,
    subcategoria_id: campos.subcategoriaId,
    objetivo_id: campos.objetivoId,
    valor_limite: campos.valorLimiteCentavos,
    periodo_meses: campos.periodoMeses,
    percentual_alvo: campos.percentualAlvo,
    status: "ativa",
  });
  if (error) throw new Error("Falha ao criar meta: " + error.message);

  revalidarMetas();
}

/** Edita = desativa a meta antiga e cria uma nova com os valores atualizados (conteúdo é imutável — ver ADR-006). */
export async function editarMeta(metaId: string, formData: FormData): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const campos = lerCampos(formData);

  const { data: meta, error: errBusca } = await supabase.from("metas").select("id, status").eq("id", metaId).single();
  if (errBusca || !meta) throw new Error("Meta não encontrada.");
  if (meta.status !== "ativa") throw new Error("Só é possível editar uma meta ativa.");

  if (await existeMetaAtivaNoMesmoEscopo(supabase, perfilId, campos, metaId)) {
    throw new Error("Já existe outra meta ativa para essa combinação de categoria/subcategoria/objetivo.");
  }

  const { error: errDesativar } = await supabase.from("metas").update({ status: "inativa" }).eq("id", metaId);
  if (errDesativar) throw new Error("Falha ao desativar a meta antiga: " + errDesativar.message);

  const { error: errCriar } = await supabase.from("metas").insert({
    perfil_id: perfilId,
    tipo: campos.tipo,
    categoria_id: campos.categoriaId,
    subcategoria_id: campos.subcategoriaId,
    objetivo_id: campos.objetivoId,
    valor_limite: campos.valorLimiteCentavos,
    periodo_meses: campos.periodoMeses,
    percentual_alvo: campos.percentualAlvo,
    status: "ativa",
  });
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
