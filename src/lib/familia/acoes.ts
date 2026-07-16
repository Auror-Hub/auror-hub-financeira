"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

function gerarCodigoConvite(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Cria uma família nova (usuário fica admin/ativo). Usuário ainda não tem membership — não passa por perfilDoUsuarioAutenticado(). */
export async function criarFamilia(nome: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const nomeTratado = nome.trim();
  if (!nomeTratado) throw new Error("Informe um nome para a família.");

  const { data: ativa } = await supabase
    .from("membros_familia")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (ativa) throw new Error("Você já tem uma família ativa.");

  // RPC (SECURITY DEFINER) em vez de dois inserts separados: criar a família
  // e reler o id (RETURNING) dispara a policy de SELECT de `familias`, que
  // exige uma membership ativa que ainda não existe nesse instante — a RPC
  // cria os dois numa transação só, bypassando RLS internamente.
  const { error: errRpc } = await supabase.rpc("criar_familia_com_membership", {
    p_nome: nomeTratado,
    p_codigo_convite: gerarCodigoConvite(),
  });
  if (errRpc) throw new Error("Falha ao criar família: " + errRpc.message);

  revalidatePath("/", "layout");
}

/** Solicita ingresso numa família via código de convite (fica pendente até um admin aprovar). */
export async function solicitarIngresso(codigoConvite: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const codigo = codigoConvite.trim().toUpperCase();
  if (!codigo) throw new Error("Informe o código de convite.");

  const { data: existente } = await supabase
    .from("membros_familia")
    .select("id, status")
    .eq("usuario_id", user.id)
    .in("status", ["ativo", "pendente"])
    .maybeSingle();
  if (existente?.status === "ativo") throw new Error("Você já tem uma família ativa.");
  if (existente?.status === "pendente") throw new Error("Você já tem uma solicitação pendente.");

  const { data: familias, error: errBusca } = await supabase.rpc("buscar_familia_por_codigo", { p_codigo: codigo });
  if (errBusca) throw new Error("Falha ao buscar família: " + errBusca.message);
  const familia = familias?.[0];
  if (!familia) throw new Error("Código de convite inválido.");

  const { error: errMembro } = await supabase
    .from("membros_familia")
    .insert({ usuario_id: user.id, familia_id: familia.id, papel: "membro", status: "pendente" });
  if (errMembro) throw new Error("Falha ao registrar solicitação: " + errMembro.message);

  revalidatePath("/onboarding");
}

/** Aprova um membro pendente — só admin ativo da mesma família (checado aqui e reforçado por RLS). */
export async function aprovarMembro(membroId: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: familia } = await supabase.from("familias").select("id").eq("id", perfilId).single();
  const souAdmin = await verificarSouAdmin(supabase, perfilId);
  if (!familia || !souAdmin) throw new Error("Só um admin pode aprovar membros.");

  const { data: membro, error: errMembro } = await supabase
    .from("membros_familia")
    .select("id, familia_id, status")
    .eq("id", membroId)
    .single();
  if (errMembro || !membro) throw new Error("Membro não encontrado.");
  if (membro.familia_id !== perfilId) throw new Error("Membro não pertence à sua família.");
  if (membro.status !== "pendente") throw new Error("Só é possível aprovar uma solicitação pendente.");

  const { error } = await supabase.from("membros_familia").update({ status: "ativo" }).eq("id", membroId);
  if (error) throw new Error("Falha ao aprovar membro: " + error.message);

  revalidatePath("/configuracoes");
}

/** Recusa um membro pendente — só admin ativo da mesma família. */
export async function recusarMembro(membroId: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const souAdmin = await verificarSouAdmin(supabase, perfilId);
  if (!souAdmin) throw new Error("Só um admin pode recusar membros.");

  const { data: membro, error: errMembro } = await supabase
    .from("membros_familia")
    .select("id, familia_id, status")
    .eq("id", membroId)
    .single();
  if (errMembro || !membro) throw new Error("Membro não encontrado.");
  if (membro.familia_id !== perfilId) throw new Error("Membro não pertence à sua família.");
  if (membro.status !== "pendente") throw new Error("Só é possível recusar uma solicitação pendente.");

  const { error } = await supabase.from("membros_familia").update({ status: "recusado" }).eq("id", membroId);
  if (error) throw new Error("Falha ao recusar membro: " + error.message);

  revalidatePath("/configuracoes");
}

/** Gera um novo código de convite — só admin. */
export async function regenerarCodigoConvite(): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const souAdmin = await verificarSouAdmin(supabase, perfilId);
  if (!souAdmin) throw new Error("Só um admin pode regenerar o código de convite.");

  const { error } = await supabase.from("familias").update({ codigo_convite: gerarCodigoConvite() }).eq("id", perfilId);
  if (error) throw new Error("Falha ao regenerar código: " + error.message);

  revalidatePath("/configuracoes");
}

async function verificarSouAdmin(supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"], perfilId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("membros_familia")
    .select("id")
    .eq("familia_id", perfilId)
    .eq("usuario_id", user.id)
    .eq("papel", "admin")
    .eq("status", "ativo")
    .maybeSingle();
  return Boolean(data);
}
