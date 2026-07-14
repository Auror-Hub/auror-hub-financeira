import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Autentica o usuário da sessão e resolve o perfil (Família Gama) associado. Usado por toda server action. */
export async function perfilDoUsuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: perfil, error } = await supabase.from("perfis").select("id").eq("usuario_id", user.id).single();
  if (error || !perfil) throw new Error("Perfil não encontrado.");

  return { supabase, user, perfilId: perfil.id as string };
}
