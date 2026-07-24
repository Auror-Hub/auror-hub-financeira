import { Settings } from "lucide-react";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { SignOutButton } from "@/components/domain/auth/SignOutButton";
import { AdicionarCartaoForm } from "@/components/domain/cartoes/AdicionarCartaoForm";
import { CartaoItem } from "@/components/domain/cartoes/CartaoItem";
import { FamiliaSection } from "@/components/domain/familia/FamiliaSection";
import { PerfilFinanceiroSection } from "@/components/domain/familia/PerfilFinanceiroSection";
import { CestaBasicaSection } from "@/components/domain/precos-externos/CestaBasicaSection";
import { carregarFamilia } from "@/lib/familia/consulta";
import { carregarCestaBasicaDaFamilia } from "@/lib/precos-externos/consulta";
import { Card, CardHeader } from "@/components/ui/Card";

export default async function ConfiguracoesPage() {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const { data: cartoes } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido, tipo, ultimos_4_digitos, ativo, dia_fechamento, dia_vencimento")
    .eq("perfil_id", perfilId);
  const [familia, cestaBasica] = await Promise.all([carregarFamilia(), carregarCestaBasicaDaFamilia()]);

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
            <CartaoItem key={c.id} cartao={c} />
          ))}
          {(cartoes ?? []).length === 0 && <li className="py-2 text-base text-text-muted">Nenhum cartão ou conta cadastrada ainda.</li>}
        </ul>
      </Card>

      <AdicionarCartaoForm />

      <FamiliaSection familia={familia} />

      <PerfilFinanceiroSection perfilFinanceiro={familia.perfilFinanceiro} souAdmin={familia.souAdmin} />

      <CestaBasicaSection cestaBasica={cestaBasica} />

      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
