"use server";

import { revalidatePath } from "next/cache";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import {
  calcularHashArquivo,
  calcularIdentificadorDeduplicacao,
  parseCsvBruto,
  parseDataCsv,
  parseValorMonetario,
} from "./parse";
import { listarAbas, lerMatrizBruta, parseXlsxBruto } from "./parseXlsx";
import { detectarLinhaCabecalho, detectarMapeamento, type MapeamentoDetectado } from "./deteccao";

function detectarTipoArquivo(nomeArquivo: string): "csv" | "xlsx" {
  return /\.xlsx?$/i.test(nomeArquivo) ? "xlsx" : "csv";
}

/** Extrai só os últimos 4 dígitos, ignorando máscara ("****1211", "**** 1211", "1211") — pra casar final de cartão de forma robusta ao formato da fatura. */
function normalizarFinalCartao(valor: string): string {
  return valor.replace(/\D/g, "").slice(-4);
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
  mapeamentoDetectado: MapeamentoDetectado;
  /** Linha de cabeçalho detectada automaticamente (planilhas com metadado antes da tabela, ex.: fatura "paga" do Itaú) — null se não achou/não tentou. */
  linhasParaPularSugerido: number | null;
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

    // Planilhas com linhas de metadado antes da tabela real (ex.: fatura
    // "paga" do Itaú — nome, agência, conta, total pago antes do cabeçalho
    // de verdade) fazem a detecção de coluna falhar se `linhasParaPular`
    // estiver errado. Tenta sempre que o valor ainda está no default 0 —
    // MESMO havendo um perfil salvo pra este cartão, porque o perfil pode
    // ser de um formato de arquivo diferente do que está sendo enviado agora
    // (ex.: perfil salvo de um CSV antigo, arquivo atual é XLSX — o cliente
    // decide qual dos dois usar comparando tipoArquivo e se as colunas
    // salvas ainda existem no arquivo atual, ver EnviarDocumentoScreen.tsx).
    let linhasParaPularEfetivo = linhasParaPular;
    let linhasParaPularSugerido: number | null = null;
    if (linhasParaPular === 0) {
      const matrizBruta = lerMatrizBruta(buffer, aba);
      const linhaDetectada = detectarLinhaCabecalho(matrizBruta);
      if (linhaDetectada !== null && linhaDetectada > 0) {
        linhasParaPularSugerido = linhaDetectada;
        linhasParaPularEfetivo = linhaDetectada;
      }
    }

    const { cabecalhos, linhas } = parseXlsxBruto(buffer, aba, linhasParaPularEfetivo);
    // Amostra maior só pra detecção (nunca exibida inteira na UI) — dá sinal
    // estatístico suficiente pra desambiguar formato de data/moeda sem custo
    // extra (é o mesmo parse que já tínhamos em mãos).
    const amostraDeteccao = linhas.slice(0, 30).map((l) => l.valores);
    return {
      tipoArquivo,
      abasDisponiveis: abas,
      abaSelecionada: aba,
      cabecalhos,
      amostra: linhas.slice(0, 5).map((l) => l.valores),
      totalLinhas: linhas.length,
      delimitadorDetectado: ",",
      perfilExistente,
      mapeamentoDetectado: detectarMapeamento(cabecalhos, amostraDeteccao),
      linhasParaPularSugerido,
    };
  }

  const conteudo = buffer.toString("utf-8");
  const primeiraLinha = conteudo.split("\n")[0] ?? "";
  const delimitadorDetectado = [";", "\t", ","].find((d) => primeiraLinha.includes(d)) ?? ",";
  const delimitadorUsado = String(formData.get("delimitador") ?? "") || delimitadorDetectado;
  const { cabecalhos, linhas } = parseCsvBruto(conteudo, delimitadorUsado);
  const amostraDeteccao = linhas.slice(0, 30).map((l) => l.valores);

  return {
    tipoArquivo,
    abasDisponiveis: [],
    abaSelecionada: "",
    cabecalhos,
    amostra: linhas.slice(0, 5).map((l) => l.valores),
    totalLinhas: linhas.length,
    delimitadorDetectado,
    perfilExistente,
    mapeamentoDetectado: detectarMapeamento(cabecalhos, amostraDeteccao),
    linhasParaPularSugerido: null,
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
  colunasNaoReconhecidas: string[];
}

export async function processarImportacao(formData: FormData): Promise<ProcessarImportacaoResultado> {
  const { supabase, user, perfilId } = await perfilDoUsuarioAutenticado();

  const arquivo = formData.get("arquivo") as File | null;
  const cartaoId = String(formData.get("cartaoId") ?? "");
  const competenciaFatura = String(formData.get("competenciaFatura") ?? "");
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
  if (!/^\d{4}-\d{2}$/.test(competenciaFatura)) {
    throw new Error("Informe a competência da fatura (mês de fechamento).");
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
      if (c.ultimos_4_digitos) mapaCartaoPorFinal.set(normalizarFinalCartao(String(c.ultimos_4_digitos)), c.id as string);
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

  // Rastreado por coluna (não por linha) pra sinalizar causa estrutural —
  // Fase 2 do importador inteligente (Insight de Produto, 2026-07-16).
  let tentativasColunaData = 0;
  let falhasColunaData = 0;
  let tentativasColunaValor = 0;
  let falhasColunaValor = 0;

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
    if (dataBruta?.trim()) {
      tentativasColunaData++;
      if (!dataIso) falhasColunaData++;
    }

    let valorCentavos: number | null;
    if (modoValor === "unica") {
      valorCentavos = colunaValor ? parseValorMonetario(linha.valores[colunaValor] ?? "", formatoMonetario) : null;
      const valorBruto = colunaValor ? linha.valores[colunaValor]?.trim() : undefined;
      if (valorBruto) {
        tentativasColunaValor++;
        if (valorCentavos === null) falhasColunaValor++;
      }
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
      const resolvido = finalCartaoBruto ? mapaCartaoPorFinal.get(normalizarFinalCartao(finalCartaoBruto)) : undefined;
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

    // Tópico A (brainstorm 3): a competência é sempre a escolhida no upload
    // (mês de fechamento da fatura), nunca calculada a partir da data da
    // linha — resolve parcelas que trazem a data da compra original, não a
    // data em que aquela parcela específica foi cobrada.
    const competencia = competenciaFatura;
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

  // Alerta por coluna (Fase 2, Insight de Produto 2026-07-16) — distinto de
  // linha_invalida: sinaliza que a coluna em si provavelmente está mapeada
  // errado (alta taxa de falha), não um punhado de linhas isoladas ruins.
  // Só considera colunas com tentativas suficientes, pra não disparar alerta
  // por ruído em amostras pequenas.
  const LIMIAR_FALHA_COLUNA = 0.3;
  const MINIMO_TENTATIVAS_COLUNA = 3;
  const colunasNaoReconhecidas: string[] = [];

  if (tentativasColunaData >= MINIMO_TENTATIVAS_COLUNA && falhasColunaData / tentativasColunaData > LIMIAR_FALHA_COLUNA) {
    colunasNaoReconhecidas.push(colunaData);
    await supabase.from("eventos_importacao").insert({
      lote_id: lote.id,
      tipo: "coluna_nao_reconhecida",
      detalhe: `Coluna "${colunaData}" (mapeada como data): ${falhasColunaData} de ${tentativasColunaData} valores não reconhecidos no formato configurado.`,
    });
  }
  if (
    modoValor === "unica" &&
    colunaValor &&
    tentativasColunaValor >= MINIMO_TENTATIVAS_COLUNA &&
    falhasColunaValor / tentativasColunaValor > LIMIAR_FALHA_COLUNA
  ) {
    colunasNaoReconhecidas.push(colunaValor);
    await supabase.from("eventos_importacao").insert({
      lote_id: lote.id,
      tipo: "coluna_nao_reconhecida",
      detalhe: `Coluna "${colunaValor}" (mapeada como valor): ${falhasColunaValor} de ${tentativasColunaValor} valores não reconhecidos no formato configurado.`,
    });
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
    colunasNaoReconhecidas,
  };
}
