import { Settings } from "lucide-react";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { SignOutButton } from "@/components/domain/auth/SignOutButton";
import { AdicionarCartaoForm } from "@/components/domain/cartoes/AdicionarCartaoForm";
import { FamiliaSection } from "@/components/domain/familia/FamiliaSection";
import { carregarFamilia } from "@/lib/familia/consulta";
import { Card, CardHeader } from "@/components/ui/Card";

export default async function ConfiguracoesPage() {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido, tipo, ultimos_4_digitos, ativo")
    .eq("perfil_id", perfilId);
  const familia = await carregarFamilia();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Configurações</h1>
      </div>

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

      <FamiliaSection familia={familia} />

      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
