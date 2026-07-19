import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import type { MensagemConsultor } from "./acoes";
import type { ItemComLink } from "./responder";

export interface ConversaAtual {
  conversaId: string | null;
  mensagens: MensagemConsultor[];
}

const VAZIA: ConversaAtual = { conversaId: null, mensagens: [] };

/**
 * Rearquitetura (Fase 0, ADR-007): carrega a conversa mais recente da família
 * ao montar a tela — até aqui `enviarPergunta` gravava tudo corretamente,
 * mas a UI nunca lia de volta (bug real, não limitação de escopo). Sem
 * "múltiplas conversas" ainda (fora de escopo, ver Fase 4) — só a mais recente.
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

  const { data: mensagensRaw, error: errMensagens } = await supabase
    .from("mensagens")
    .select("id, autor, texto, criado_em")
    .eq("conversa_id", conversa.id)
    .order("criado_em", { ascending: true });
  if (errMensagens) throw new Error("Falha ao carregar mensagens: " + errMensagens.message);
  const mensagensRows = mensagensRaw ?? [];
  if (mensagensRows.length === 0) return { conversaId: conversa.id as string, mensagens: [] };

  const idsMensagensConsultor = mensagensRows.filter((m) => m.autor === "consultor").map((m) => m.id as string);
  const { data: respostasRaw, error: errRespostas } = await supabase
    .from("respostas_consultor")
    .select("mensagem_id, resposta_direta, evidencias, interpretacao, ressalvas, acoes_possiveis, aprofundamento")
    .in("mensagem_id", idsMensagensConsultor.length > 0 ? idsMensagensConsultor : ["00000000-0000-0000-0000-000000000000"]);
  if (errRespostas) throw new Error("Falha ao carregar respostas do consultor: " + errRespostas.message);
  const respostaPorMensagem = new Map((respostasRaw ?? []).map((r) => [r.mensagem_id as string, r]));

  const mensagens: MensagemConsultor[] = mensagensRows.map((m) => {
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
          }
        : undefined,
    };
  });

  return { conversaId: conversa.id as string, mensagens };
}
