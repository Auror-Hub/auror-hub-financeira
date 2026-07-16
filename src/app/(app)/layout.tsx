import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionProvider } from "@/lib/session/SessionContext";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade — o middleware já redireciona sem sessão, mas
  // uma rota autenticada nunca deve renderizar sem usuário confirmado.
  if (!user) {
    redirect("/entrar");
  }

  const { data: membro } = await supabase
    .from("membros_familia")
    .select("familias(nome)")
    .eq("usuario_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();

  // Usuário autenticado sem família ativa (recém-cadastrado, ou pendente/recusado) — ADR-004.
  if (!membro) {
    redirect("/onboarding");
  }

  const session = {
    userName: user.email ?? "Conta",
    profileName: membro.familias?.[0]?.nome ?? "Acervo",
  };

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
