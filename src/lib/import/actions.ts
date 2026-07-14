"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calcularCompetencia,
  calcularHashArquivo,
  calcularIdentificadorDeduplicacao,
  parseCsvBruto,
  parseDataCsv,
  parseValorMonetario,
} from "./parse";
import { listarAbas, parseXlsxBruto } from "./parseXlsx";

function detectarTipoArquivo(nomeArquivo: string): "csv" | "xlsx" {
  return /\.xlsx?$/i.test(nomeArquivo) ? "xlsx" : "csv";
}

async function perfilDoUsuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: perfil, error } = await supabase.from("perfis").select("id").eq("usuario_id", user.id).single();
  if (error || !perfil) throw new Error("Perfil não encontrado.");

  return { supabase, user, perfilId: perfil.id as string };
}

export async function criarCartao(formData: FormData) {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const instituicao = String(formData.get("instituicao") ?? "").trim();
  const apelido = String(formData.get("apelido") ?? "").trim() || null;
  const ultimos4 = String(formData.get("ultimos4") ?? "").trim() || null;

  if (!instituicao) throw new Error("Instituição é obrigatória.");

  const { error } = await supabase.from("cartoes").insert({
    perfil_id: perfilId,
    instituicao,
    apelido,
    ultimos_4_digitos: ultimos4,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/enviar");
  revalidatePath("/configuracoes");
}

export interface PerfilExistenteResumo {
  tipoArquivo: "csv" | "xlsx";
  aba: string | null;
  linhasParaPular: number;
  delimitador: string;
  formatoData: string;
  formatoMonetario: "BR" | "US";
  colunaData: string;
  colunaDescricao: string;
  modoValor: "unica" | "credito_debito";
  colunaValor: string | null;
  colunaCredito: string | null;
  colunaDebito: string | null;
  colunaParcela: string | null;
}

export interface AnalisarArquivoResultado {
  tipoArquivo: "csv" | "xlsx";
  abasDisponiveis: string[];
  abaSelecionada: string;
  cabecalhos: string[];
  amostra: Record<string, string>[];
  totalLinhas: number;
  delimitadorDetectado: string;
  perfilExistente: PerfilExistenteResumo | null;
}

/** Preview: lê cabeçalhos + amostra de linhas, sem persistir nada. Chamável de novo ao ajustar aba/linhas-a-pular. */
export async function analisarArquivo(formData: FormData): Promise<AnalisarArquivoResultado> {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const arquivo = formData.get("arquivo") as File | null;
  const cartaoId = String(formData.get("cartaoId") ?? "");
  const abaSolicitada = String(formData.get("aba") ?? "") || undefined;
  const linhasParaPular = Number(formData.get("linhasParaPular") ?? 0) || 0;

  if (!arquivo || !cartaoId) throw new Error("Arquivo e cartão são obrigatórios.");

  const tipoArquivo = detectarTipoArquivo(arquivo.name);
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const { data: perfilRow } = await supabase.from("perfis_importacao").select("*").eq("cartao_id", cartaoId).maybeSingle();

  const perfilExistente: PerfilExistenteResumo | null = perfilRow
    ? {
        tipoArquivo: perfilRow.tipo_arquivo,
        aba: perfilRow.aba,
        linhasParaPular: perfilRow.linhas_para_pular,
        delimitador: perfilRow.delimitador,
        formatoData: perfilRow.formato_data,
        formatoMonetario: perfilRow.formato_monetario,
        colunaData: perfilRow.coluna_data,
        colunaDescricao: perfilRow.coluna_descricao,
        modoValor: perfilRow.modo_valor,
        colunaValor: perfilRow.coluna_valor,
        colunaCredito: perfilRow.coluna_credito,
        colunaDebito: perfilRow.coluna_debito,
        colunaParcela: perfilRow.coluna_parcela,
      }
    : null;

  if (tipoArquivo === "xlsx") {
    const abas = listarAbas(buffer);
    const aba = abaSolicitada ?? abas[0] ?? "";
    const { cabecalhos, linhas } = parseXlsxBruto(buffer, aba, linhasParaPular);
    return {
      tipoArquivo,
      abasDisponiveis: abas,
      abaSelecionada: aba,
      cabecalhos,
      amostra: linhas.slice(0, 5).map((l) => l.valores),
      totalLinhas: linhas.length,
      delimitadorDetectado: ",",
      perfilExistente,
    };
  }

  const conteudo = buffer.toString("utf-8");
  const primeiraLinha = conteudo.split("\n")[0] ?? "";
  const delimitadorDetectado = [";", "\t", ","].find((d) => primeiraLinha.includes(d)) ?? ",";
  const delimitadorUsado = String(formData.get("delimitador") ?? "") || delimitadorDetectado;
  const { cabecalhos, linhas } = parseCsvBruto(conteudo, delimitadorUsado);

  return {
    tipoArquivo,
    abasDisponiveis: [],
    abaSelecionada: "",
    cabecalhos,
    amostra: linhas.slice(0, 5).map((l) => l.valores),
    totalLinhas: linhas.length,
    delimitadorDetectado,
    perfilExistente,
  };
}

export interface ProcessarImportacaoResultado {
  documentoId: string;
  loteId: string;
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  duplicatasSinalizadas: number;
  totalExtraido: number;
}

export async function processarImportacao(formData: FormData): Promise<ProcessarImportacaoResultado> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  const arquivo = formData.get("arquivo") as File | null;
  const cartaoId = String(formData.get("cartaoId") ?? "");
  const aba = String(formData.get("aba") ?? "") || undefined;
  const linhasParaPular = Number(formData.get("linhasParaPular") ?? 0) || 0;
  const delimitador = String(formData.get("delimitador") ?? ",");
  const colunaData = String(formData.get("colunaData") ?? "");
  const colunaDescricao = String(formData.get("colunaDescricao") ?? "");
  const modoValor = (String(formData.get("modoValor") ?? "unica") as "unica" | "credito_debito");
  const colunaValor = String(formData.get("colunaValor") ?? "") || undefined;
  const colunaCredito = String(formData.get("colunaCredito") ?? "") || undefined;
  const colunaDebito = String(formData.get("colunaDebito") ?? "") || undefined;
  const colunaParcela = String(formData.get("colunaParcela") ?? "") || undefined;
  const formatoData = String(formData.get("formatoData") ?? "DD/MM/YYYY");
  const formatoMonetario = (String(formData.get("formatoMonetario") ?? "BR") as "BR" | "US");
  const dataReferencia = String(formData.get("dataReferencia") ?? "") || undefined;

  if (!arquivo || !cartaoId || !colunaData || !colunaDescricao) {
    throw new Error("Preencha o cartão e o mapeamento de colunas obrigatório.");
  }
  if (modoValor === "unica" && !colunaValor) {
    throw new Error("Selecione a coluna de valor.");
  }
  if (modoValor === "credito_debito" && !colunaCredito && !colunaDebito) {
    throw new Error("Selecione ao menos uma coluna de crédito ou débito.");
  }
  if (formatoData === "DD/MM" && !dataReferencia) {
    throw new Error("Informe a data de referência da fatura — necessária quando a data não traz o ano.");
  }

  const tipoArquivo = detectarTipoArquivo(arquivo.name);
  const { data: cartao } = await supabase.from("cartoes").select("instituicao").eq("id", cartaoId).single();

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const hashArquivo = calcularHashArquivo(buffer);

  const { data: docExistente } = await supabase
    .from("documentos_origem")
    .select("id")
    .eq("perfil_id", perfilId)
    .eq("hash", hashArquivo)
    .maybeSingle();
  if (docExistente) {
    throw new Error("Este arquivo já foi importado anteriormente (mesmo conteúdo detectado).");
  }

  const storagePath = `${user.id}/${Date.now()}-${arquivo.name}`;
  const { error: uploadError } = await supabase.storage.from("documentos-origem").upload(storagePath, buffer, {
    contentType:
      tipoArquivo === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv",
  });
  if (uploadError) throw new Error("Falha ao salvar arquivo no storage: " + uploadError.message);

  const { data: documento, error: docError } = await supabase
    .from("documentos_origem")
    .insert({
      perfil_id: perfilId,
      cartao_id: cartaoId,
      nome_arquivo: arquivo.name,
      hash: hashArquivo,
      storage_path: storagePath,
      status_processamento: "extraindo",
    })
    .select()
    .single();
  if (docError || !documento) throw new Error(docError?.message ?? "Falha ao registrar documento.");

  const { data: lote, error: loteError } = await supabase
    .from("lotes_importacao")
    .insert({ documento_id: documento.id, status: "extraindo" })
    .select()
    .single();
  if (loteError || !lote) throw new Error(loteError?.message ?? "Falha ao registrar lote.");

  const { linhas, erros: errosParse } =
    tipoArquivo === "xlsx"
      ? parseXlsxBruto(buffer, aba ?? "", linhasParaPular)
      : parseCsvBruto(buffer.toString("utf-8"), delimitador);

  for (const erro of errosParse) {
    await supabase.from("eventos_importacao").insert({ lote_id: lote.id, tipo: "erro", detalhe: erro });
  }

  let linhasValidas = 0;
  let linhasInvalidas = 0;
  let totalExtraido = 0;
  let duplicatasSinalizadas = 0;

  for (const linha of linhas) {
    const dataBruta = linha.valores[colunaData];
    const descricaoBruta = linha.valores[colunaDescricao]?.trim();

    const dataIso = dataBruta ? parseDataCsv(dataBruta, formatoData, dataReferencia) : null;

    let valorCentavos: number | null;
    if (modoValor === "unica") {
      valorCentavos = colunaValor ? parseValorMonetario(linha.valores[colunaValor] ?? "", formatoMonetario) : null;
    } else {
      const credito = colunaCredito ? parseValorMonetario(linha.valores[colunaCredito] ?? "", formatoMonetario) : null;
      const debito = colunaDebito ? parseValorMonetario(linha.valores[colunaDebito] ?? "", formatoMonetario) : null;
      if (credito !== null && credito !== 0) valorCentavos = Math.abs(credito);
      else if (debito !== null && debito !== 0) valorCentavos = -Math.abs(debito);
      else valorCentavos = null;
    }

    if (!dataIso || !descricaoBruta || valorCentavos === null) {
      linhasInvalidas++;
      // Nunca gravar data/valor/descrição brutos no evento — só a posição da linha (SECURITY-AND-DATA.md).
      await supabase.from("eventos_importacao").insert({
        lote_id: lote.id,
        tipo: "linha_invalida",
        detalhe: `Linha ${linha.numeroLinha}: dados insuficientes ou inválidos no mapeamento configurado.`,
      });
      continue;
    }

    const competencia = calcularCompetencia(dataIso);
    const idDedup = calcularIdentificadorDeduplicacao({
      data: dataIso,
      valor: valorCentavos,
      fornecedorOriginal: descricaoBruta,
      cartaoId,
    });

    const { data: possivelDuplicata } = await supabase
      .from("lancamentos_brutos")
      .select("id")
      .eq("cartao_id", cartaoId)
      .eq("identificador_deduplicacao", idDedup)
      .maybeSingle();

    const parcelaBruta = colunaParcela ? linha.valores[colunaParcela] : undefined;
    const parcelaAtual = parcelaBruta ? Number.parseInt(parcelaBruta, 10) : null;

    const { data: novoLancamento, error: lancamentoError } = await supabase
      .from("lancamentos_brutos")
      .insert({
        lote_importacao_id: lote.id,
        cartao_id: cartaoId,
        competencia_calculada: competencia,
        data: dataIso,
        fornecedor_original: descricaoBruta,
        descricao_original: descricaoBruta,
        valor: valorCentavos,
        parcela_atual: Number.isNaN(parcelaAtual) ? null : parcelaAtual,
        moeda: "BRL",
        arquivo_origem_id: documento.id,
        pagina_ou_posicao: String(linha.numeroLinha),
        identificador_deduplicacao: idDedup,
      })
      .select()
      .single();

    if (lancamentoError || !novoLancamento) {
      linhasInvalidas++;
      await supabase.from("eventos_importacao").insert({
        lote_id: lote.id,
        tipo: "erro",
        detalhe: `Linha ${linha.numeroLinha}: falha ao gravar lançamento.`,
      });
      continue;
    }

    if (possivelDuplicata) {
      duplicatasSinalizadas++;
      await supabase.from("possiveis_duplicatas").insert({
        lancamento_a_id: possivelDuplicata.id,
        lancamento_b_id: novoLancamento.id,
        motivo: "Mesma data, valor e fornecedor de um lançamento já existente para este cartão.",
      });
      await supabase.from("eventos_importacao").insert({
        lote_id: lote.id,
        tipo: "duplicidade",
        detalhe: `Linha ${linha.numeroLinha}: possível duplicata sinalizada para revisão.`,
      });
    }

    linhasValidas++;
    totalExtraido += valorCentavos;
  }

  await supabase
    .from("lotes_importacao")
    .update({
      status: "concluido",
      concluido_em: new Date().toISOString(),
      quantidade_extraida: linhasValidas,
      total_extraido: totalExtraido,
    })
    .eq("id", lote.id);

  await supabase.from("documentos_origem").update({ status_processamento: "concluido" }).eq("id", documento.id);

  await supabase.from("perfis_importacao").upsert(
    {
      perfil_id: perfilId,
      cartao_id: cartaoId,
      instituicao: cartao?.instituicao ?? "Desconhecida",
      tipo_arquivo: tipoArquivo,
      aba: aba ?? null,
      linhas_para_pular: linhasParaPular,
      delimitador,
      formato_data: formatoData,
      formato_monetario: formatoMonetario,
      coluna_data: colunaData,
      coluna_descricao: colunaDescricao,
      modo_valor: modoValor,
      coluna_valor: colunaValor ?? null,
      coluna_credito: colunaCredito ?? null,
      coluna_debito: colunaDebito ?? null,
      coluna_parcela: colunaParcela ?? null,
      ultima_utilizacao: new Date().toISOString(),
    },
    { onConflict: "cartao_id" },
  );

  revalidatePath("/enviar");
  revalidatePath("/caixa-de-entrada");

  return {
    documentoId: documento.id,
    loteId: lote.id,
    totalLinhas: linhas.length,
    linhasValidas,
    linhasInvalidas,
    duplicatasSinalizadas,
    totalExtraido,
  };
}
