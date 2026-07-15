import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface TermoGerenciavel {
  id: string;
  dimensao: "categoria" | "subcategoria" | "objetivo";
  termoPaiId: string | null;
  rotulo: string;
  status: "ativo" | "desativado" | "proposto";
  origem: "padrão do sistema" | "criado pelo usuário" | "sugerido pela IA";
}

/** Carrega todos os termos (qualquer status) — para a tela de gestão em /taxonomia. */
export async function carregarTodosOsTermos(): Promise<TermoGerenciavel[]> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data, error } = await supabase
    .from("taxonomia_termos")
    .select("id, dimensao, termo_pai_id, rotulo, status, origem")
    .order("rotulo", { ascending: true });
  if (error) throw new Error("Falha ao carregar taxonomia: " + error.message);

  return (data ?? []).map((t) => ({
    id: t.id as string,
    dimensao: t.dimensao as TermoGerenciavel["dimensao"],
    termoPaiId: t.termo_pai_id as string | null,
    rotulo: t.rotulo as string,
    status: t.status as TermoGerenciavel["status"],
    origem: t.origem as TermoGerenciavel["origem"],
  }));
}
