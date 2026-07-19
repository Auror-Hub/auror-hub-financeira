"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";

function revalidarProvisorios(): void {
  revalidatePath("/caixa-de-entrada");
}

interface CamposProvisorio {
  dataOcorrencia: string;
  valorCentavos: number;
  descricaoUsuario: string;
  fornecedorDica: string | null;
  categoriaDica: string | null;
  objetivoDica: string | null;
  contexto: string | null;
}

function lerCampos(formData: FormData): CamposProvisorio {
  const dataOcorrencia = String(formData.get("dataOcorrencia") ?? "").trim();
  if (!dataOcorrencia) throw new Error("Informe a data do gasto.");
  const valorReais = Number(formData.get("valor") ?? "");
  if (!Number.isFinite(valorReais) || valorReais <= 0) throw new Error("Informe um valor válido, maior que zero.");
  const descricaoUsuario = String(formData.get("descricaoUsuario") ?? "").trim();
  if (!descricaoUsuario) throw new Error("Descreva o gasto.");
  return {
    dataOcorrencia,
    valorCentavos: -Math.round(valorReais * 100), // captura rápida é sempre despesa (mesmo sinal de lancamentos_brutos.valor)
    descricaoUsuario,
    fornecedorDica: String(formData.get("fornecedorDica") ?? "").trim() || null,
    categoriaDica: String(formData.get("categoriaDica") ?? "").trim() || null,
    objetivoDica: String(formData.get("objetivoDica") ?? "").trim() || null,
    contexto: String(formData.get("contexto") ?? "").trim() || null,
  };
}

/** Captura rápida: grava a intenção de gasto, sem tocar em lancamentos_brutos (RUL-1). */
export async function criarProvisorio(formData: FormData): Promise<void> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();
  const campos = lerCampos(formData);

  const { error } = await supabase.from("lancamentos_provisorios").insert({
    perfil_id: perfilId,
    criado_por: user.id,
    data_ocorrencia: campos.dataOcorrencia,
    valor: campos.valorCentavos,
    descricao_usuario: campos.descricaoUsuario,
    fornecedor_dica: campos.fornecedorDica,
    categoria_dica: campos.categoriaDica,
    objetivo_dica: campos.objetivoDica,
    contexto: campos.contexto,
  });
  if (error) throw new Error("Falha ao registrar lançamento provisório: " + error.message);

  revalidarProvisorios();
}

async function proximaVersao(supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"], lancamentoId: string): Promise<number> {
  const { data } = await supabase
    .from("classificacao_decisoes")
    .select("versao")
    .eq("lancamento_id", lancamentoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.versao ?? 0) + 1;
}

async function buscarProvisorioAtivo(
  supabase: Awaited<ReturnType<typeof perfilDoUsuarioAutenticado>>["supabase"],
  provisorioId: string,
) {
  const { data, error } = await supabase
    .from("lancamentos_provisorios")
    .select("id, status, categoria_dica, objetivo_dica, contexto")
    .eq("id", provisorioId)
    .single();
  if (error || !data) throw new Error("Provisório não encontrado.");
  if (data.status !== "aguardando_conciliacao") throw new Error("Este provisório já foi resolvido.");
  return data;
}

/**
 * Concilia o provisório com um lançamento real. Se havia categoria_dica, ela
 * é aplicada como decisão de classificação — a Victoria já informou a
 * categoria no momento da captura, não é inferência silenciosa (mesma régua
 * de "toda decisão humana é registrada" do resto do app).
 */
export async function conciliarProvisorio(provisorioId: string, lancamentoId: string): Promise<void> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();
  const provisorio = await buscarProvisorioAtivo(supabase, provisorioId);

  const { error: errUpdate } = await supabase
    .from("lancamentos_provisorios")
    .update({ status: "conciliado", lancamento_conciliado_id: lancamentoId })
    .eq("id", provisorioId);
  if (errUpdate) throw new Error("Falha ao conciliar: " + errUpdate.message);

  if (provisorio.categoria_dica) {
    const versao = await proximaVersao(supabase, lancamentoId);
    await supabase.from("classificacao_decisoes").insert({
      lancamento_id: lancamentoId,
      categoria_id: provisorio.categoria_dica,
      objetivo_id: provisorio.objetivo_dica,
      contexto: provisorio.contexto,
      origem_da_decisao: "manual",
      status: "confirmada",
      versao,
    });
  }

  await supabase.from("eventos_auditoria").insert({
    perfil_id: perfilId,
    entidade_relacionada_tipo: "lancamento_provisorio",
    entidade_relacionada_id: provisorioId,
    tipo_evento: "decisão",
    ator: "usuário",
    detalhe: { acao: "conciliado", lancamentoId },
  });

  revalidarProvisorios();
}

/** Nenhum candidato correspondia — o gasto real ainda não chegou no extrato/fatura. */
export async function marcarNaoEncontrado(provisorioId: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();
  await buscarProvisorioAtivo(supabase, provisorioId);
  const { error } = await supabase.from("lancamentos_provisorios").update({ status: "nao_encontrado" }).eq("id", provisorioId);
  if (error) throw new Error("Falha ao marcar como não encontrado: " + error.message);
  revalidarProvisorios();
}

/** Captura foi um engano/duplicata — descarta sem afetar nenhum lançamento real. */
export async function descartarProvisorio(provisorioId: string): Promise<void> {
  const { supabase } = await perfilDoUsuarioAutenticado();
  await buscarProvisorioAtivo(supabase, provisorioId);
  const { error } = await supabase.from("lancamentos_provisorios").update({ status: "descartado" }).eq("id", provisorioId);
  if (error) throw new Error("Falha ao descartar: " + error.message);
  revalidarProvisorios();
}
