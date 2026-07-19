import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarMetas } from "@/lib/metas/consulta";
import { MetaListScreen } from "@/components/domain/metas/MetaListScreen";

export default async function MetasPage() {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const metas = await carregarMetas();

  return <MetaListScreen metas={metas} categorias={categorias} />;
}
