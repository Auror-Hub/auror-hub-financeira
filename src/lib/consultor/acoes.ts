"use server";

import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { interpretarPergunta, type IntencaoEstruturada } from "./interpretar";
import { recuperarDados } from "./recuperar";
import { prepararRascunho, type RascunhoAcao } from "./rascunho";
import { identificarCampoFaltante } from "./slot-filling";
import { responderComDados, respostaDeRascunho, respostaSemRascunho, respostaPedindoCampo, type ItemComLink } from "./responder";
import { carregarConversaPorId, type ConversaAtual } from "./consulta";
import { criarMeta, editarMeta } from "@/lib/metas/acoes";
import { criarProvisorio } from "@/lib/provisorios/acoes";
import { corrigirClassificacao } from "@/lib/classificacao/decisoes";

const INTENCOES_MUTACAO = ["criar_rascunho_meta", "criar_rascunho_ajuste_plano", "criar_lancamento_provisorio", "criar_rascunho_correcao_classificacao"] as const;

/** Fase 11 (Auditoria V2): quantas rodadas de pergunta-resposta o Consultor tenta antes de desistir de completar uma mutação incompleta (mesmo espírito de outros limiares do projeto — heurística de primeiro corte). */
const MAX_TENTATIVAS_INTENCAO_PENDENTE = 3;

interface IntencaoPendente {
  intencaoParcial: IntencaoEstruturada;
  campoFaltante: string;
  pergunta: string;
  tentativas: number;
}

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
    rascunhoAcao?: RascunhoAcao | null;
    resolvidoComo?: "confirmado" | "descartado" | null;
  };
}

export interface ResultadoEnviarPergunta {
  conversaId: string;
  mensagemUsuario: MensagemConsultor;
  mensagemConsultor: MensagemConsultor;
}

function truncarTitulo(texto: string): string {
  const limpo = texto.trim().replace(/\s+/g, " ");
  return limpo.length <= 60 ? limpo : limpo.slice(0, 57) + "...";
}

/**
 * Ponto de entrada único da conversa: cria a conversa sob demanda, grava a
 * pergunta, interpreta→recupera/prepara→responde, e grava a resposta. Cada
 * etapa é append-only (RUL-12: toda resposta de IA carrega justificativa/
 * evidência). Rearquitetura (Fase 4, ADR-007): as 4 intenções de mutação
 * passam por `prepararRascunho` em vez de `recuperarDados` — nunca executam
 * nada aqui, só preparam a proposta pra confirmação explícita.
 *
 * Fase 11 (Auditoria V2, slot-filling): se a conversa tem uma intenção de
 * mutação incompleta pendente (`conversas.intencao_pendente`), a mensagem
 * atual é interpretada como resposta a ela — a intenção parcial é mesclada
 * com o que a IA extrair desta mensagem. `intencao_pendente` é limpa sempre
 * que a rodada termina resolvida (rascunho pronto, desistência, ou intenção
 * de leitura) e persiste só quando ainda falta exatamente um campo.
 */
export async function enviarPergunta(conversaId: string | null, texto: string): Promise<ResultadoEnviarPergunta> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  let idConversa = conversaId;
  let intencaoPendenteAtual: IntencaoPendente | null = null;

  if (!idConversa) {
    const { data: novaConversa, error: errConversa } = await supabase
      .from("conversas")
      .insert({ perfil_id: perfilId, titulo: truncarTitulo(texto) })
      .select()
      .single();
    if (errConversa || !novaConversa) throw new Error("Falha ao iniciar conversa: " + (errConversa?.message ?? "erro desconhecido"));
    idConversa = novaConversa.id as string;
  } else {
    const { data: conversaRow } = await supabase.from("conversas").select("intencao_pendente").eq("id", idConversa).maybeSingle();
    intencaoPendenteAtual = (conversaRow?.intencao_pendente ?? null) as IntencaoPendente | null;
  }

  const { data: mensagemUsuarioRaw, error: errMsgUsuario } = await supabase
    .from("mensagens")
    .insert({ conversa_id: idConversa, autor: "usuario", texto })
    .select()
    .single();
  if (errMsgUsuario || !mensagemUsuarioRaw) throw new Error("Falha ao gravar pergunta: " + (errMsgUsuario?.message ?? "erro desconhecido"));

  const { data: categoriasRaw } = await supabase.from("taxonomia_termos").select("rotulo").eq("dimensao", "categoria").eq("status", "ativo");
  const categorias = (categoriasRaw ?? []).map((c) => c.rotulo as string);
  const { data: familiaRow } = await supabase.from("familias").select("nome").eq("id", perfilId).single();
  const nomeFamilia = (familiaRow?.nome as string | undefined) ?? "a família";

  const intencaoBruta = intencaoPendenteAtual
    ? await interpretarPergunta(texto, categorias, nomeFamilia, {
        intencaoParcial: intencaoPendenteAtual.intencaoParcial,
        pergunta: intencaoPendenteAtual.pergunta,
      })
    : await interpretarPergunta(texto, categorias, nomeFamilia);

  // Defesa extra além da instrução de prompt: só mescla se a IA manteve a
  // mesma intenção pendente — evita poluir uma intenção genuinamente nova
  // (ex.: usuário mudou de assunto) com campos de uma mutação abandonada.
  const intencao: IntencaoEstruturada =
    intencaoPendenteAtual && intencaoBruta.intencao === intencaoPendenteAtual.intencaoParcial.intencao
      ? { ...intencaoPendenteAtual.intencaoParcial, ...intencaoBruta }
      : intencaoBruta;

  await supabase.from("consultas_analiticas").insert({
    mensagem_id: mensagemUsuarioRaw.id,
    intencao: intencao.intencao,
    parametros: intencao,
  });

  const ehMutacao = (INTENCOES_MUTACAO as readonly string[]).includes(intencao.intencao);
  let resposta;
  let novaIntencaoPendente: IntencaoPendente | null = null;

  if (ehMutacao) {
    const rascunho = await prepararRascunho(intencao);
    if (rascunho) {
      resposta = respostaDeRascunho(rascunho);
    } else {
      const campoFaltante = identificarCampoFaltante(intencao);
      const tentativasAnteriores = intencaoPendenteAtual?.tentativas ?? 0;
      if (campoFaltante && tentativasAnteriores + 1 < MAX_TENTATIVAS_INTENCAO_PENDENTE) {
        resposta = respostaPedindoCampo(campoFaltante);
        novaIntencaoPendente = {
          intencaoParcial: intencao,
          campoFaltante: campoFaltante.campo,
          pergunta: campoFaltante.pergunta,
          tentativas: tentativasAnteriores + 1,
        };
      } else {
        resposta = respostaSemRascunho(intencao.intencao);
      }
    }
  } else {
    resposta = await responderComDados(texto, intencao, await recuperarDados(intencao), nomeFamilia);
  }

  // Sempre grava o estado final de intencao_pendente — seta quando ainda
  // falta um campo específico, limpa em qualquer outro desfecho (rascunho
  // pronto, desistência, ou pergunta de leitura).
  await supabase.from("conversas").update({ intencao_pendente: novaIntencaoPendente }).eq("id", idConversa);

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
    rascunho_acao: resposta.rascunhoAcao ?? null,
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
        rascunhoAcao: resposta.rascunhoAcao ?? null,
        resolvidoComo: null,
      },
    },
  };
}

/**
 * Confirma um rascunho proposto pelo Consultor — despacha pra exatamente a
 * mesma server action que a tela correspondente já usa (criarMeta/
 * editarMeta/criarProvisorio/corrigirClassificacao), todas escopadas por
 * `perfilDoUsuarioAutenticado()` — nenhuma superfície de autorização nova.
 * Fase 11 (Auditoria V2): grava o estado de resolução no servidor
 * (`respostas_consultor.resolvido_como`) — recarregar a página não mostra
 * mais os botões de novo.
 */
export async function confirmarRascunhoConsultor(mensagemId: string, rascunho: RascunhoAcao): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  switch (rascunho.tipo) {
    case "criar_meta": {
      const formData = new FormData();
      formData.set("tipo", rascunho.params.tipoMeta);
      if (rascunho.params.categoriaId) formData.set("categoriaId", rascunho.params.categoriaId);
      if (rascunho.params.subcategoriaId) formData.set("subcategoriaId", rascunho.params.subcategoriaId);
      if (rascunho.params.objetivoId) formData.set("objetivoId", rascunho.params.objetivoId);
      if (rascunho.params.valorLimiteReais != null) formData.set("valorLimite", String(rascunho.params.valorLimiteReais));
      if (rascunho.params.periodoMeses != null) formData.set("periodoMeses", String(rascunho.params.periodoMeses));
      if (rascunho.params.percentualAlvo != null) formData.set("percentualAlvo", String(rascunho.params.percentualAlvo));
      await criarMeta(formData);
      break;
    }
    case "ajustar_meta": {
      const formData = new FormData();
      formData.set("tipo", "limite_absoluto");
      if (rascunho.params.categoriaId) formData.set("categoriaId", rascunho.params.categoriaId);
      if (rascunho.params.subcategoriaId) formData.set("subcategoriaId", rascunho.params.subcategoriaId);
      if (rascunho.params.objetivoId) formData.set("objetivoId", rascunho.params.objetivoId);
      formData.set("valorLimite", String(rascunho.params.novoValorReais));
      await editarMeta(rascunho.params.metaId, formData);
      break;
    }
    case "criar_provisorio": {
      const formData = new FormData();
      formData.set("dataOcorrencia", rascunho.params.dataOcorrencia);
      formData.set("valor", String(rascunho.params.valorReais));
      formData.set("descricaoUsuario", rascunho.params.descricaoUsuario);
      if (rascunho.params.fornecedorDica) formData.set("fornecedorDica", rascunho.params.fornecedorDica);
      if (rascunho.params.categoriaId) formData.set("categoriaDica", rascunho.params.categoriaId);
      if (rascunho.params.objetivoId) formData.set("objetivoDica", rascunho.params.objetivoId);
      await criarProvisorio(formData);
      break;
    }
    case "corrigir_classificacao": {
      await corrigirClassificacao(rascunho.params.lancamentoId, {
        categoriaId: rascunho.params.novaCategoriaId,
        subcategoriaId: rascunho.params.novaSubcategoriaId ?? undefined,
        objetivoId: rascunho.params.novoObjetivoId,
      });
      break;
    }
  }

  const { error } = await supabase
    .from("respostas_consultor")
    .update({ resolvido_em: new Date().toISOString(), resolvido_como: "confirmado" })
    .eq("mensagem_id", mensagemId);
  if (error) throw new Error("Falha ao registrar confirmação do rascunho: " + error.message);
}

/** Fase 11 (Auditoria V2): descarta um rascunho sem executar nada — grava o estado no servidor pra não reaparecer "ativo" após reload. */
export async function descartarRascunhoConsultor(mensagemId: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();
  const { error } = await supabase
    .from("respostas_consultor")
    .update({ resolvido_em: new Date().toISOString(), resolvido_como: "descartado" })
    .eq("mensagem_id", mensagemId);
  if (error) throw new Error("Falha ao registrar descarte do rascunho: " + error.message);
}

/** Fase 11 (Auditoria V2): wrapper de server action pra `carregarConversaPorId` — usado pelo seletor de conversas (componente cliente) pra trocar de conversa sem navegação de página. */
export async function carregarMensagensDaConversa(conversaId: string): Promise<ConversaAtual> {
  return carregarConversaPorId(conversaId);
}

/** Fase 11 (Auditoria V2): renomeia o título de uma conversa (gerado da primeira pergunta, editável). */
export async function renomearConversa(conversaId: string, novoTitulo: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();
  const titulo = novoTitulo.trim().slice(0, 120);
  if (!titulo) throw new Error("O título não pode ficar vazio.");
  const { error } = await supabase.from("conversas").update({ titulo }).eq("id", conversaId);
  if (error) throw new Error("Falha ao renomear a conversa: " + error.message);
}
