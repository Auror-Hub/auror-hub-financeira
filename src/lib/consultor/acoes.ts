"use server";

import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { interpretarPergunta } from "./interpretar";
import { recuperarDados } from "./recuperar";
import { prepararRascunho, type RascunhoAcao } from "./rascunho";
import { responderComDados, respostaDeRascunho, respostaSemRascunho, type ItemComLink } from "./responder";
import { criarMeta, editarMeta } from "@/lib/metas/acoes";
import { criarProvisorio } from "@/lib/provisorios/acoes";
import { corrigirClassificacao } from "@/lib/classificacao/decisoes";

const INTENCOES_MUTACAO = ["criar_rascunho_meta", "criar_rascunho_ajuste_plano", "criar_lancamento_provisorio", "criar_rascunho_correcao_classificacao"] as const;

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
  };
}

export interface ResultadoEnviarPergunta {
  conversaId: string;
  mensagemUsuario: MensagemConsultor;
  mensagemConsultor: MensagemConsultor;
}

/**
 * Ponto de entrada único da conversa: cria a conversa sob demanda, grava a
 * pergunta, interpreta→recupera/prepara→responde, e grava a resposta. Cada
 * etapa é append-only (RUL-12: toda resposta de IA carrega justificativa/
 * evidência). Rearquitetura (Fase 4, ADR-007): as 4 intenções de mutação
 * passam por `prepararRascunho` em vez de `recuperarDados` — nunca executam
 * nada aqui, só preparam a proposta pra confirmação explícita.
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
  const { data: familiaRow } = await supabase.from("familias").select("nome").eq("id", perfilId).single();
  const nomeFamilia = (familiaRow?.nome as string | undefined) ?? "a família";

  const intencao = await interpretarPergunta(texto, categorias, nomeFamilia);

  await supabase.from("consultas_analiticas").insert({
    mensagem_id: mensagemUsuarioRaw.id,
    intencao: intencao.intencao,
    parametros: intencao,
  });

  const ehMutacao = (INTENCOES_MUTACAO as readonly string[]).includes(intencao.intencao);
  const resposta = ehMutacao
    ? await (async () => {
        const rascunho = await prepararRascunho(intencao);
        return rascunho ? respostaDeRascunho(rascunho) : respostaSemRascunho(intencao.intencao);
      })()
    : await responderComDados(texto, intencao, await recuperarDados(intencao), nomeFamilia);

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
      },
    },
  };
}

/**
 * Confirma um rascunho proposto pelo Consultor — despacha pra exatamente a
 * mesma server action que a tela correspondente já usa (criarMeta/
 * editarMeta/criarProvisorio/corrigirClassificacao), todas escopadas por
 * `perfilDoUsuarioAutenticado()` — nenhuma superfície de autorização nova.
 */
export async function confirmarRascunhoConsultor(rascunho: RascunhoAcao): Promise<void> {
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
      return;
    }
    case "ajustar_meta": {
      const formData = new FormData();
      formData.set("tipo", "limite_absoluto");
      if (rascunho.params.categoriaId) formData.set("categoriaId", rascunho.params.categoriaId);
      if (rascunho.params.subcategoriaId) formData.set("subcategoriaId", rascunho.params.subcategoriaId);
      if (rascunho.params.objetivoId) formData.set("objetivoId", rascunho.params.objetivoId);
      formData.set("valorLimite", String(rascunho.params.novoValorReais));
      await editarMeta(rascunho.params.metaId, formData);
      return;
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
      return;
    }
    case "corrigir_classificacao": {
      await corrigirClassificacao(rascunho.params.lancamentoId, {
        categoriaId: rascunho.params.novaCategoriaId,
        subcategoriaId: rascunho.params.novaSubcategoriaId ?? undefined,
        objetivoId: rascunho.params.novoObjetivoId,
      });
      return;
    }
  }
}
