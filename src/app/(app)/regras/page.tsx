import { createClient } from "@/lib/supabase/server";
import { carregarRegras } from "@/lib/regras/consulta";
import { RuleListScreen } from "@/components/domain/regras/RuleListScreen";

export default async function RegrasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfis").select("id").eq("usuario_id", user!.id).single();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo").eq("status", "ativo");
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const regras = perfil ? await carregarRegras() : [];

  return <RuleListScreen regras={regras} categorias={categorias} objetivos={objetivos} />;
}
