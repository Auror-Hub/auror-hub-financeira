import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarMetas } from "@/lib/metas/consulta";
import { MetaListScreen } from "@/components/domain/metas/MetaListScreen";

export default async function MetasPage() {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo, termo_pai_id").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]> = {};
  for (const t of taxonomia ?? []) {
    if (t.dimensao !== "subcategoria" || !t.termo_pai_id) continue;
    const paiId = t.termo_pai_id as string;
    (subcategoriasPorCategoria[paiId] ??= []).push({ id: t.id as string, rotulo: t.rotulo as string });
  }

  const metas = await carregarMetas();

  return (
    <MetaListScreen metas={metas} categorias={categorias} subcategoriasPorCategoria={subcategoriasPorCategoria} objetivos={objetivos} />
  );
}
