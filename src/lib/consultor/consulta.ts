import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { MensagemConsultor } from "./acoes";
import type { ItemComLink } from "./responder";
import type { RascunhoAcao } from "./rascunho";

export interface ConversaAtual {
  conversaId: string | null;
  mensagens: MensagemConsultor[];
}

export interface ConversaResumo {
  id: string;
  titulo: string | null;
  iniciadaEm: string;
}

const VAZIA: ConversaAtual = { conversaId: null, mensagens: [] };

type SupabaseServer = Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"];

/** Compartilhado entre `carregarConversaAtual`/`carregarConversaPorId` — monta as mensagens de UMA conversa já resolvida. */
export async function carregarMensagensPorConversaId(supabase: SupabaseServer, conversaId: string): Promise<MensagemConsultor[]> {
  const { data: mensagensRaw, error: errMensagens } = await supabase
    .from("mensagens")
    .select("id, autor, texto, criado_em")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: true });
  if (errMensagens) throw new Error("Falha ao carregar mensagens: " + errMensagens.message);
  const mensagensRows = mensagensRaw ?? [];
  if (mensagensRows.length === 0) return [];

  const idsMensagensConsultor = mensagensRows.filter((m) => m.autor === "consultor").map((m) => m.id as string);
  const { data: respostasRaw, error: errRespostas } = await supabase
    .from("respostas_consultor")
    .select("mensagem_id, resposta_direta, evidencias, interpretacao, ressalvas, acoes_possiveis, aprofundamento, rascunho_acao, resolvido_como")
    .in("mensagem_id", idsMensagensConsultor.length > 0 ? idsMensagensConsultor : ["00000000-0000-0000-0000-000000000000"]);
  if (errRespostas) throw new Error("Falha ao carregar respostas do consultor: " + errRespostas.message);
  const respostaPorMensagem = new Map((respostasRaw ?? []).map((r) => [r.mensagem_id as string, r]));

  return mensagensRows.map((m) => {
    const id = m.id as string;
    const autor = m.autor as "usuario" | "consultor";
    const resposta = respostaPorMensagem.get(id);
    return {
      id,
      autor,
      texto: m.texto as string,
      criadoEm: m.criado_em as string,
      resposta: resposta
        ? {
            respostaDireta: resposta.resposta_direta as string,
            evidencias: (resposta.evidencias ?? []) as ItemComLink[],
            interpretacao: resposta.interpretacao as string,
            ressalvas: resposta.ressalvas as string,
            acoesPossiveis: (resposta.acoes_possiveis ?? []) as ItemComLink[],
            aprofundamento: resposta.aprofundamento as string,
            rascunhoAcao: (resposta.rascunho_acao ?? null) as RascunhoAcao | null,
            resolvidoComo: (resposta.resolvido_como ?? null) as "confirmado" | "descartado" | null,
          }
        : undefined,
    };
  });
}

/**
 * Rearquitetura (Fase 0, ADR-007): carrega a conversa mais recente da família
 * ao montar a tela. Fase 11 (Auditoria V2): agora convive com múltiplas
 * conversas — esta função continua sendo o default de abertura da tela
 * (a mais recente), mas `carregarConversaPorId` permite trocar de conversa.
 */
export async function carregarConversaAtual(): Promise<ConversaAtual> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: conversa, error: errConversa } = await supabase
    .from("conversas")
    .select("id")
    .eq("perfil_id", perfilId)
    .order("iniciada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errConversa) throw new Error("Falha ao carregar conversa: " + errConversa.message);
  if (!conversa) return VAZIA;

  const mensagens = await carregarMensagensPorConversaId(supabase, conversa.id as string);
  return { conversaId: conversa.id as string, mensagens };
}

/** Fase 11 (Auditoria V2): abre uma conversa específica (troca de conversa na UI) — `perfil_id` no filtro garante que só conversas da própria família são acessíveis, redundante com a RLS mas explícito. */
export async function carregarConversaPorId(conversaId: string): Promise<ConversaAtual> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: conversa, error: errConversa } = await supabase
    .from("conversas")
    .select("id")
    .eq("id", conversaId)
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (errConversa) throw new Error("Falha ao carregar conversa: " + errConversa.message);
  if (!conversa) return VAZIA;

  const mensagens = await carregarMensagensPorConversaId(supabase, conversa.id as string);
  return { conversaId: conversa.id as string, mensagens };
}

/** Fase 11 (Auditoria V2): lista as conversas da família, mais recente primeiro — alimenta o seletor de conversas da tela do Consultor. */
export async function carregarConversas(): Promise<ConversaResumo[]> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data, error } = await supabase
    .from("conversas")
    .select("id, titulo, iniciada_em")
    .eq("perfil_id", perfilId)
    .order("iniciada_em", { ascending: false });
  if (error) throw new Error("Falha ao carregar conversas: " + error.message);

  return (data ?? []).map((c) => ({
    id: c.id as string,
    titulo: (c.titulo as string | null) ?? null,
    iniciadaEm: c.iniciada_em as string,
  }));
}
