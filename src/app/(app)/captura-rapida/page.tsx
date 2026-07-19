import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { CapturaRapidaForm } from "@/components/domain/provisorios/CapturaRapidaForm";

export default async function CapturaRapidaPage() {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  return <CapturaRapidaForm categorias={categorias} objetivos={objetivos} />;
}
