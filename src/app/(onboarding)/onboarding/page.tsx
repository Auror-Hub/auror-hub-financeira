import { carregarSolicitacoesDoUsuario } from "@/lib/familia/consulta";
import { OnboardingScreen } from "@/components/domain/onboarding/OnboardingScreen";

export default async function OnboardingPage() {
  const solicitacoes = await carregarSolicitacoesDoUsuario();
  return <OnboardingScreen solicitacoes={solicitacoes} />;
}
