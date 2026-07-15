"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

/** Cria um novo termo de taxonomia (categoria/subcategoria/objetivo) — origem sempre "criado pelo usuário". */
export async function criarTermo(formData: FormData): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const dimensao = String(formData.get("dimensao") ?? "");
  const rotulo = String(formData.get("rotulo") ?? "").trim();
  const termoPaiId = String(formData.get("termoPaiId") ?? "") || null;

  if (!["categoria", "subcategoria", "objetivo"].includes(dimensao)) throw new Error("Dimensão inválida.");
  if (!rotulo) throw new Error("Informe um rótulo.");
  if (dimensao === "subcategoria" && !termoPaiId) throw new Error("Subcategoria precisa de uma categoria pai.");

  const { error } = await supabase.from("taxonomia_termos").insert({
    dimensao,
    rotulo,
    termo_pai_id: dimensao === "subcategoria" ? termoPaiId : null,
    status: "ativo",
    origem: "criado pelo usuário",
  });
  if (error) throw new Error("Falha ao criar termo: " + error.message);

  revalidatePath("/taxonomia");
}

/** Edita só o rótulo — dimensão/hierarquia são imutáveis (bloqueado por trigger). Rótulo pode mudar sem quebrar decisões históricas. */
export async function editarRotulo(id: string, novoRotulo: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const rotulo = novoRotulo.trim();
  if (!rotulo) throw new Error("Rótulo não pode ficar em branco.");

  const { error } = await supabase.from("taxonomia_termos").update({ rotulo }).eq("id", id);
  if (error) throw new Error("Falha ao editar rótulo: " + error.message);

  revalidatePath("/taxonomia");
}

/** "Excluir" na prática é desativar — termo nunca é removido, decisões antigas continuam íntegras. */
export async function desativarTermo(id: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { error } = await supabase.from("taxonomia_termos").update({ status: "desativado" }).eq("id", id);
  if (error) throw new Error("Falha ao desativar termo: " + error.message);

  revalidatePath("/taxonomia");
}

/** Reativa um termo desativado por engano. */
export async function reativarTermo(id: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { error } = await supabase.from("taxonomia_termos").update({ status: "ativo" }).eq("id", id);
  if (error) throw new Error("Falha ao reativar termo: " + error.message);

  revalidatePath("/taxonomia");
}
