import "server-only";
import { createClient } from "@/lib/supabase/server";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

export interface MembroFamilia {
  id: string;
  usuarioId: string;
  nome: string | null;
  email: string;
  papel: "admin" | "membro";
  status: "ativo" | "pendente" | "recusado";
}

export type SituacaoMoradia = "propria" | "alugada" | "financiada" | "outra";

/** Fase 12 (Auditoria V2): extensão opcional de `familias` — tudo nullable, nunca bloqueia uso do resto da Hub. Só habilita comparação externa (relatório/benchmark) quando `consentimentoComparacaoExterna` é explicitamente true. */
export interface PerfilFinanceiroFamilia {
  rendaBrutaMensal: number | null;
  rendaLiquidaMensal: number | null;
  cidade: string | null;
  estado: string | null;
  numeroPessoas: number | null;
  situacaoMoradia: SituacaoMoradia | null;
  consentimentoComparacaoExterna: boolean;
}

export interface FamiliaDados {
  id: string;
  nome: string;
  codigoConvite: string;
  souAdmin: boolean;
  membros: MembroFamilia[];
  perfilFinanceiro: PerfilFinanceiroFamilia;
}

/** Carrega a família do usuário autenticado (nome, código de convite, membros/pendências, perfil financeiro) — usado em Configurações → Família. */
export async function carregarFamilia(): Promise<FamiliaDados> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: familia, error: errFamilia } = await supabase
    .from("familias")
    .select(
      "id, nome, codigo_convite, renda_bruta_mensal, renda_liquida_mensal, cidade, estado, numero_pessoas, situacao_moradia, consentimento_comparacao_externa",
    )
    .eq("id", perfilId)
    .single();
  if (errFamilia || !familia) throw new Error("Família não encontrada.");

  const { data: membrosRaw, error: errMembros } = await supabase
    .from("membros_familia")
    .select("id, usuario_id, papel, status, criado_em")
    .eq("familia_id", perfilId)
    .order("criado_em", { ascending: true });
  if (errMembros) throw new Error("Falha ao carregar membros: " + errMembros.message);

  const usuarioIds = (membrosRaw ?? []).map((m) => m.usuario_id as string);
  const { data: usuariosRaw } =
    usuarioIds.length > 0
      ? await supabase.from("usuarios").select("id, nome, email").in("id", usuarioIds)
      : { data: [] as { id: string; nome: string | null; email: string }[] };
  const usuarioPorId = new Map((usuariosRaw ?? []).map((u) => [u.id as string, u]));

  const membros: MembroFamilia[] = (membrosRaw ?? []).map((m) => {
    const usuario = usuarioPorId.get(m.usuario_id as string);
    return {
      id: m.id as string,
      usuarioId: m.usuario_id as string,
      nome: (usuario?.nome as string | null) ?? null,
      email: (usuario?.email as string | undefined) ?? "—",
      papel: m.papel as "admin" | "membro",
      status: m.status as "ativo" | "pendente" | "recusado",
    };
  });

  const souAdmin = membros.some((m) => m.usuarioId === user.id && m.papel === "admin" && m.status === "ativo");

  return {
    id: familia.id as string,
    nome: familia.nome as string,
    codigoConvite: familia.codigo_convite as string,
    souAdmin,
    membros,
    perfilFinanceiro: {
      rendaBrutaMensal: (familia.renda_bruta_mensal as number | null) ?? null,
      rendaLiquidaMensal: (familia.renda_liquida_mensal as number | null) ?? null,
      cidade: (familia.cidade as string | null) ?? null,
      estado: (familia.estado as string | null) ?? null,
      numeroPessoas: (familia.numero_pessoas as number | null) ?? null,
      situacaoMoradia: (familia.situacao_moradia as SituacaoMoradia | null) ?? null,
      consentimentoComparacaoExterna: Boolean(familia.consentimento_comparacao_externa),
    },
  };
}

export interface SolicitacaoDoUsuario {
  id: string;
  familiaNome: string;
  status: "pendente" | "recusado";
}

/** Usado em /onboarding — usuário sem membership ativa ainda, por isso não passa por perfilDoUsuarioAutenticado(). */
export async function carregarSolicitacoesDoUsuario(): Promise<SolicitacaoDoUsuario[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data, error } = await supabase
    .from("membros_familia")
    .select("id, status, familias(nome)")
    .eq("usuario_id", user.id)
    .neq("status", "ativo");
  if (error) throw new Error("Falha ao carregar solicitações: " + error.message);

  return (data ?? []).map((m) => ({
    id: m.id as string,
    familiaNome: (m.familias as { nome: string }[] | null)?.[0]?.nome ?? "—",
    status: m.status as "pendente" | "recusado",
  }));
}
