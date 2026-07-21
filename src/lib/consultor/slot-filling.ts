import type { IntencaoEstruturada } from "./interpretar";

export interface CampoFaltante {
  /** Nome do campo em `IntencaoEstruturada` — usado só pra rastreio/depuração, nunca exibido. */
  campo: string;
  /** Pergunta de follow-up, em português, pronta pra mostrar no chat. */
  pergunta: string;
}

/**
 * Fase 11 (Auditoria V2): identifica o primeiro campo estrutural faltante de
 * uma intenção de mutação — puro, sem I/O, e deliberadamente mais estreito
 * que `prepararRascunho` (rascunho.ts): só cobre ausência estrutural óbvia
 * (ex.: "cria uma meta" sem valor nenhum), nunca falha de resolução que
 * depende de banco (categoria inexistente, lançamento ambíguo) — essas
 * continuam caindo na resposta de limitação genérica, porque não há uma
 * única pergunta de follow-up que resolva ambiguidade com segurança.
 */
export function identificarCampoFaltante(intencao: IntencaoEstruturada): CampoFaltante | null {
  switch (intencao.intencao) {
    case "criar_rascunho_meta": {
      const tipoMeta = intencao.tipoMeta ?? "limite_absoluto";
      if (tipoMeta === "limite_absoluto") {
        if (!intencao.valorLimiteReais || intencao.valorLimiteReais <= 0) {
          return { campo: "valorLimiteReais", pergunta: "Qual o valor do limite mensal, em reais?" };
        }
      } else {
        if (!intencao.percentualAlvo || intencao.percentualAlvo <= 0 || intencao.percentualAlvo >= 100) {
          return { campo: "percentualAlvo", pergunta: "Qual o percentual de redução desejado (entre 1 e 99)?" };
        }
        if (!intencao.periodoMeses || ![1, 3, 6, 12].includes(intencao.periodoMeses)) {
          return { campo: "periodoMeses", pergunta: "Comparar com a média de quantos meses — 1, 3, 6 ou 12?" };
        }
      }
      return null;
    }
    case "criar_rascunho_ajuste_plano":
      if (!intencao.valorLimiteReais || intencao.valorLimiteReais <= 0) {
        return { campo: "valorLimiteReais", pergunta: "Qual o novo valor do limite, em reais?" };
      }
      return null;
    case "criar_lancamento_provisorio":
      if (!intencao.descricaoUsuario) return { campo: "descricaoUsuario", pergunta: "O que foi esse gasto?" };
      if (!intencao.valorReais || intencao.valorReais <= 0) return { campo: "valorReais", pergunta: "Qual foi o valor, em reais?" };
      if (!intencao.dataOcorrencia) return { campo: "dataOcorrencia", pergunta: "Em que data isso aconteceu?" };
      return null;
    case "criar_rascunho_correcao_classificacao":
      if (!intencao.fornecedorTexto) return { campo: "fornecedorTexto", pergunta: "Qual o fornecedor ou a descrição do lançamento a corrigir?" };
      if (!intencao.novaCategoriaRotulo) return { campo: "novaCategoriaRotulo", pergunta: "Para qual categoria devo corrigir?" };
      return null;
    default:
      return null;
  }
}
