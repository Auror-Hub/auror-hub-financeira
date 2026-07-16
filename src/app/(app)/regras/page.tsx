import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarRegras } from "@/lib/regras/consulta";
import { RuleListScreen } from "@/components/domain/regras/RuleListScreen";

export default async function RegrasPage() {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const regras = await carregarRegras();

  return <RuleListScreen regras={regras} categorias={categorias} objetivos={objetivos} />;
}
