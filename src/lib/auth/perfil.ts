import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Lançado quando o usuário autenticado não tem nenhuma membership ativa em `membros_familia` (ADR-004) — precisa passar por /onboarding. */
export class SemFamiliaError extends Error {
  constructor() {
    super("Usuário sem família ativa.");
    this.name = "SemFamiliaError";
  }
}

/** Autentica o usuário da sessão e resolve a família (acervo compartilhado) associada. Usado por toda server action. */
export async function perfilDoUsuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: membro, error } = await supabase
    .from("membros_familia")
    .select("familia_id")
    .eq("usuario_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (error || !membro) throw new SemFamiliaError();

  return { supabase, user, perfilId: membro.familia_id as string };
}
