"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
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

export async function criarCartao(formData: FormData) {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const instituicao = String(formData.get("instituicao") ?? "").trim();
  const apelido = String(formData.get("apelido") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "cartao") === "conta" ? "conta" : "cartao";
  const ultimos4 = tipo === "cartao" ? String(formData.get("ultimos4") ?? "").trim() || null : null;

  if (!instituicao) throw new Error("Instituição é obrigatória.");

  const { error } = await supabase.from("cartoes").insert({
    perfil_id: perfilId,
    instituicao,
    apelido,
    tipo,
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
  colunaCartao: string | null;
  inverterSinal: boolean;
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
        colunaCartao: perfilRow.coluna_cartao,
        inverterSinal: perfilRow.inverter_sinal,
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

/** Linhas de pagamento da fatura (ex.: "PAGAMENTO PIX") não são gasto — nunca viram lançamento bruto. */
const PADRAO_PAGAMENTO_FATURA = /^pagamento\b/i;

export interface ProcessarImportacaoResultado {
  documentoId: string;
  loteId: string;
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  pagamentosIgnorados: number;
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
  const colunaCartao = String(formData.get("colunaCartao") ?? "") || undefined;
  const inverterSinal = String(formData.get("inverterSinal") ?? "") === "true";
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

  let queryDocExistente = supabase
    .from("documentos_origem")
    .select("id")
    .eq("perfil_id", perfilId)
    .eq("hash", hashArquivo)
    .neq("status_processamento", "falhou");
  queryDocExistente = aba ? queryDocExistente.eq("aba", aba) : queryDocExistente.is("aba", null);
  const { data: docExistente } = await queryDocExistente.maybeSingle();
  if (docExistente) {
    throw new Error(
      tipoArquivo === "xlsx"
        ? "Esta aba deste arquivo já foi importada anteriormente (mesmo conteúdo e aba detectados)."
        : "Este arquivo já foi importado anteriormente (mesmo conteúdo detectado).",
    );
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
      aba: aba ?? null,
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

  // Faturas com mais de um cartão da mesma conta (físico/virtual/adicional)
  // trazem uma coluna por linha com o final do cartão — resolve o cartao_id
  // real de cada linha por essa coluna, em vez de usar sempre o cartão
  // selecionado no envio (ADR-003: titular do cartão não define o objetivo).
  const mapaCartaoPorFinal = new Map<string, string>();
  if (colunaCartao) {
    const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id, ultimos_4_digitos").eq("perfil_id", perfilId);
    for (const c of cartoesDoPerfil ?? []) {
      if (c.ultimos_4_digitos) mapaCartaoPorFinal.set(String(c.ultimos_4_digitos).trim(), c.id as string);
    }

    // Faturas exportadas costumam preencher a coluna do cartão só na primeira
    // linha de cada bloco, deixando as demais em branco (valor "repetido
    // visualmente", não de fato). Preenche pra baixo com o último valor visto.
    let ultimoValorCartao: string | undefined;
    for (const linha of linhas) {
      const bruto = linha.valores[colunaCartao]?.trim();
      if (bruto) ultimoValorCartao = bruto;
      else if (ultimoValorCartao) linha.valores[colunaCartao] = ultimoValorCartao;
    }
  }

  let linhasValidas = 0;
  let linhasInvalidas = 0;
  let pagamentosIgnorados = 0;
  let totalExtraido = 0;
  let duplicatasSinalizadas = 0;

  for (const linha of linhas) {
    const dataBruta = linha.valores[colunaData];
    const descricaoBruta = linha.valores[colunaDescricao]?.trim();

    if (descricaoBruta && PADRAO_PAGAMENTO_FATURA.test(descricaoBruta)) {
      pagamentosIgnorados++;
      // Nunca gravar a descrição bruta no evento (SECURITY-AND-DATA.md).
      await supabase.from("eventos_importacao").insert({
        lote_id: lote.id,
        tipo: "linha_invalida",
        detalhe: `Linha ${linha.numeroLinha}: identificada como pagamento da fatura (não é gasto) — não importada.`,
      });
      continue;
    }

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

    // Convenção interna: gasto = negativo. Algumas instituições (ex.: Itaú)
    // representam gasto como positivo no modo "uma coluna só" — inverte
    // aqui pra manter o sinal consistente entre cartões de bancos diferentes.
    if (inverterSinal && valorCentavos !== null) valorCentavos = -valorCentavos;

    let cartaoIdLinha = cartaoId;
    if (colunaCartao) {
      const finalCartaoBruto = linha.valores[colunaCartao]?.trim();
      const resolvido = finalCartaoBruto ? mapaCartaoPorFinal.get(finalCartaoBruto) : undefined;
      if (!resolvido) {
        linhasInvalidas++;
        // Nunca gravar o final do cartão bruto no evento — só a posição da linha (SECURITY-AND-DATA.md).
        await supabase.from("eventos_importacao").insert({
          lote_id: lote.id,
          tipo: "linha_invalida",
          detalhe: `Linha ${linha.numeroLinha}: final de cartão não corresponde a nenhum cartão cadastrado.`,
        });
        continue;
      }
      cartaoIdLinha = resolvido;
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
      cartaoId: cartaoIdLinha,
    });

    const { data: possivelDuplicata } = await supabase
      .from("lancamentos_brutos")
      .select("id")
      .eq("cartao_id", cartaoIdLinha)
      .eq("identificador_deduplicacao", idDedup)
      .maybeSingle();

    const parcelaBruta = colunaParcela ? linha.valores[colunaParcela] : undefined;
    const parcelaAtual = parcelaBruta ? Number.parseInt(parcelaBruta, 10) : null;

    const { data: novoLancamento, error: lancamentoError } = await supabase
      .from("lancamentos_brutos")
      .insert({
        lote_importacao_id: lote.id,
        cartao_id: cartaoIdLinha,
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

  // 0 linhas válidas indica mapeamento de colunas errado, não uma fatura sem
  // lançamentos — marca como "falhou" em vez de "concluído" pra não travar
  // uma nova tentativa (dedup por hash+aba) nem "aprender" a configuração
  // errada como perfil reutilizável.
  const importacaoTeveSucesso = linhasValidas > 0;
  const statusFinal = importacaoTeveSucesso ? "concluido" : "falhou";

  await supabase
    .from("lotes_importacao")
    .update({
      status: statusFinal,
      concluido_em: new Date().toISOString(),
      quantidade_extraida: linhasValidas,
      total_extraido: totalExtraido,
    })
    .eq("id", lote.id);

  await supabase.from("documentos_origem").update({ status_processamento: statusFinal }).eq("id", documento.id);

  if (importacaoTeveSucesso) {
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
        coluna_cartao: colunaCartao ?? null,
        inverter_sinal: inverterSinal,
        ultima_utilizacao: new Date().toISOString(),
      },
      { onConflict: "cartao_id" },
    );
  }

  revalidatePath("/enviar");
  revalidatePath("/caixa-de-entrada");

  return {
    documentoId: documento.id,
    loteId: lote.id,
    totalLinhas: linhas.length,
    linhasValidas,
    linhasInvalidas,
    pagamentosIgnorados,
    duplicatasSinalizadas,
    totalExtraido,
  };
}
