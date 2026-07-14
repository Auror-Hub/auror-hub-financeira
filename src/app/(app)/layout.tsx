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

  const { data: perfil } = await supabase.from("perfis").select("nome_perfil").eq("usuario_id", user.id).single();

  const session = {
    userName: user.email ?? "Conta",
    profileName: perfil?.nome_perfil ?? "Família Gama",
  };

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
