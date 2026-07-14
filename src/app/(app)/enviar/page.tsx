import { createClient } from "@/lib/supabase/server";
import { EnviarDocumentoScreen } from "@/components/domain/importacao/EnviarDocumentoScreen";

export default async function EnviarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfis").select("id").eq("usuario_id", user!.id).single();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido")
    .eq("perfil_id", perfil?.id ?? "")
    .eq("ativo", true);

  return <EnviarDocumentoScreen cartoes={cartoes ?? []} />;
}
