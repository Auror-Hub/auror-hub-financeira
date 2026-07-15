"use server";

import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { interpretarPergunta } from "./interpretar";
import { recuperarDados } from "./recuperar";
import { responderComDados, type ItemComLink } from "./responder";

export interface MensagemConsultor {
  id: string;
  autor: "usuario" | "consultor";
  texto: string;
  criadoEm: string;
  resposta?: {
    respostaDireta: string;
    evidencias: ItemComLink[];
    interpretacao: string;
    ressalvas: string;
    acoesPossiveis: ItemComLink[];
    aprofundamento: string;
  };
}

export interface ResultadoEnviarPergunta {
  conversaId: string;
  mensagemUsuario: MensagemConsultor;
  mensagemConsultor: MensagemConsultor;
}

/**
 * Ponto de entrada único da conversa: cria a conversa sob demanda, grava a
 * pergunta, interpreta→recupera→responde, e grava a resposta. Cada etapa é
 * append-only (RUL-12: toda resposta de IA carrega justificativa/evidência).
 */
export async function enviarPergunta(conversaId: string | null, texto: string): Promise<ResultadoEnviarPergunta> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  let idConversa = conversaId;
  if (!idConversa) {
    const { data: novaConversa, error: errConversa } = await supabase
      .from("conversas")
      .insert({ perfil_id: perfilId })
      .select()
      .single();
    if (errConversa || !novaConversa) throw new Error("Falha ao iniciar conversa: " + (errConversa?.message ?? "erro desconhecido"));
    idConversa = novaConversa.id as string;
  }

  const { data: mensagemUsuarioRaw, error: errMsgUsuario } = await supabase
    .from("mensagens")
    .insert({ conversa_id: idConversa, autor: "usuario", texto })
    .select()
    .single();
  if (errMsgUsuario || !mensagemUsuarioRaw) throw new Error("Falha ao gravar pergunta: " + (errMsgUsuario?.message ?? "erro desconhecido"));

  const { data: categoriasRaw } = await supabase.from("taxonomia_termos").select("rotulo").eq("dimensao", "categoria").eq("status", "ativo");
  const categorias = (categoriasRaw ?? []).map((c) => c.rotulo as string);

  const intencao = await interpretarPergunta(texto, categorias);

  await supabase.from("consultas_analiticas").insert({
    mensagem_id: mensagemUsuarioRaw.id,
    intencao: intencao.intencao,
    parametros: intencao,
  });

  const dados = await recuperarDados(intencao);
  const resposta = await responderComDados(texto, intencao, dados);

  const { data: mensagemConsultorRaw, error: errMsgConsultor } = await supabase
    .from("mensagens")
    .insert({ conversa_id: idConversa, autor: "consultor", texto: resposta.respostaDireta })
    .select()
    .single();
  if (errMsgConsultor || !mensagemConsultorRaw) throw new Error("Falha ao gravar resposta: " + (errMsgConsultor?.message ?? "erro desconhecido"));

  const { error: errResposta } = await supabase.from("respostas_consultor").insert({
    mensagem_id: mensagemConsultorRaw.id,
    resposta_direta: resposta.respostaDireta,
    evidencias: resposta.evidencias,
    interpretacao: resposta.interpretacao,
    ressalvas: resposta.ressalvas,
    acoes_possiveis: resposta.acoesPossiveis,
    aprofundamento: resposta.aprofundamento,
  });
  if (errResposta) throw new Error("Falha ao gravar detalhamento da resposta: " + errResposta.message);

  return {
    conversaId: idConversa,
    mensagemUsuario: {
      id: mensagemUsuarioRaw.id as string,
      autor: "usuario",
      texto: mensagemUsuarioRaw.texto as string,
      criadoEm: mensagemUsuarioRaw.criado_em as string,
    },
    mensagemConsultor: {
      id: mensagemConsultorRaw.id as string,
      autor: "consultor",
      texto: mensagemConsultorRaw.texto as string,
      criadoEm: mensagemConsultorRaw.criado_em as string,
      resposta: {
        respostaDireta: resposta.respostaDireta,
        evidencias: resposta.evidencias,
        interpretacao: resposta.interpretacao,
        ressalvas: resposta.ressalvas,
        acoesPossiveis: resposta.acoesPossiveis,
        aprofundamento: resposta.aprofundamento,
      },
    },
  };
}
