import { createClient } from "@/lib/supabase/server";
import { EnviarTabs } from "@/components/domain/importacao/EnviarTabs";

export default async function EnviarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfis").select("id").eq("usuario_id", user!.id).single();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido, tipo")
    .eq("perfil_id", perfil?.id ?? "")
    .eq("ativo", true);

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, termo_pai_id, rotulo").eq("status", "ativo");

  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]> = {};
  for (const categoria of categorias) {
    subcategoriasPorCategoria[categoria.id] = (taxonomia ?? [])
      .filter((t) => t.dimensao === "subcategoria" && t.termo_pai_id === categoria.id)
      .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  }

  return (
    <EnviarTabs
      cartoes={cartoes ?? []}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
    />
  );
}
