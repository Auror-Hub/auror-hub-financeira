import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlaceholderScreen } from "@/components/common/PlaceholderScreen";
import { SignOutButton } from "@/components/domain/auth/SignOutButton";
import { AdicionarCartaoForm } from "@/components/domain/cartoes/AdicionarCartaoForm";
import { Card, CardHeader } from "@/components/ui/Card";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfis").select("id").eq("usuario_id", user!.id).single();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido, tipo, ultimos_4_digitos, ativo")
    .eq("perfil_id", perfil?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <PlaceholderScreen
        title="Configurações"
        icon={Settings}
        note="Preferências gerais ainda não foram implementadas. Cartões e contas (BE-2) já são reais."
      />

      <Card>
        <CardHeader title="Cartões e contas" count={cartoes?.length ?? 0} />
        <ul className="flex flex-col divide-y divide-border-subtle">
          {(cartoes ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span className="text-base text-text-primary">{c.apelido || c.instituicao}</span>
              <span className="text-sm text-text-muted">
                {c.tipo === "conta" ? "Conta" : "Cartão"} · {c.instituicao}
                {c.ultimos_4_digitos ? ` · •••• ${c.ultimos_4_digitos}` : ""}
              </span>
            </li>
          ))}
          {(cartoes ?? []).length === 0 && <li className="py-2 text-base text-text-muted">Nenhum cartão ou conta cadastrada ainda.</li>}
        </ul>
      </Card>

      <AdicionarCartaoForm />

      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
