import { describe, expect, it } from "vitest";
import { identificarCampoFaltante } from "./slot-filling";
import type { IntencaoEstruturada } from "./interpretar";

function intencao(overrides: Partial<IntencaoEstruturada>): IntencaoEstruturada {
  return { intencao: "criar_rascunho_meta", ...overrides };
}

describe("identificarCampoFaltante", () => {
  it("criar_rascunho_meta (limite_absoluto) sem valor -> pede valorLimiteReais", () => {
    const resultado = identificarCampoFaltante(intencao({ categoriaRotulo: "Lazer e cultura" }));
    expect(resultado?.campo).toBe("valorLimiteReais");
  });

  it("criar_rascunho_meta (limite_absoluto) com valor -> null", () => {
    const resultado = identificarCampoFaltante(intencao({ categoriaRotulo: "Lazer e cultura", valorLimiteReais: 500 }));
    expect(resultado).toBeNull();
  });

  it("criar_rascunho_meta (reducao_percentual) sem percentual -> pede percentualAlvo", () => {
    const resultado = identificarCampoFaltante(intencao({ tipoMeta: "reducao_percentual" }));
    expect(resultado?.campo).toBe("percentualAlvo");
  });

  it("criar_rascunho_meta (reducao_percentual) com percentual mas sem período -> pede periodoMeses", () => {
    const resultado = identificarCampoFaltante(intencao({ tipoMeta: "reducao_percentual", percentualAlvo: 10 }));
    expect(resultado?.campo).toBe("periodoMeses");
  });

  it("criar_rascunho_meta (reducao_percentual) completo -> null", () => {
    const resultado = identificarCampoFaltante(intencao({ tipoMeta: "reducao_percentual", percentualAlvo: 10, periodoMeses: 3 }));
    expect(resultado).toBeNull();
  });

  it("criar_rascunho_ajuste_plano sem valor -> pede valorLimiteReais", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_rascunho_ajuste_plano", categoriaRotulo: "Alimentação" }));
    expect(resultado?.campo).toBe("valorLimiteReais");
  });

  it("criar_rascunho_ajuste_plano com valor -> null", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_rascunho_ajuste_plano", valorLimiteReais: 800 }));
    expect(resultado).toBeNull();
  });

  it("criar_lancamento_provisorio sem descrição -> pede descricaoUsuario", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_lancamento_provisorio", valorReais: 50, dataOcorrencia: "2026-07-20" }));
    expect(resultado?.campo).toBe("descricaoUsuario");
  });

  it("criar_lancamento_provisorio sem valor -> pede valorReais", () => {
    const resultado = identificarCampoFaltante(
      intencao({ intencao: "criar_lancamento_provisorio", descricaoUsuario: "Almoço", dataOcorrencia: "2026-07-20" }),
    );
    expect(resultado?.campo).toBe("valorReais");
  });

  it("criar_lancamento_provisorio sem data -> pede dataOcorrencia", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_lancamento_provisorio", descricaoUsuario: "Almoço", valorReais: 50 }));
    expect(resultado?.campo).toBe("dataOcorrencia");
  });

  it("criar_lancamento_provisorio completo -> null", () => {
    const resultado = identificarCampoFaltante(
      intencao({ intencao: "criar_lancamento_provisorio", descricaoUsuario: "Almoço", valorReais: 50, dataOcorrencia: "2026-07-20" }),
    );
    expect(resultado).toBeNull();
  });

  it("criar_rascunho_correcao_classificacao sem fornecedor -> pede fornecedorTexto", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_rascunho_correcao_classificacao", novaCategoriaRotulo: "Transporte" }));
    expect(resultado?.campo).toBe("fornecedorTexto");
  });

  it("criar_rascunho_correcao_classificacao sem nova categoria -> pede novaCategoriaRotulo", () => {
    const resultado = identificarCampoFaltante(intencao({ intencao: "criar_rascunho_correcao_classificacao", fornecedorTexto: "Posto Ipiranga" }));
    expect(resultado?.campo).toBe("novaCategoriaRotulo");
  });

  it("criar_rascunho_correcao_classificacao completo -> null (ambiguidade de lançamento não é campo faltante)", () => {
    const resultado = identificarCampoFaltante(
      intencao({ intencao: "criar_rascunho_correcao_classificacao", fornecedorTexto: "Posto Ipiranga", novaCategoriaRotulo: "Transporte" }),
    );
    expect(resultado).toBeNull();
  });

  it("intenções de leitura e fora_de_escopo nunca têm campo faltante", () => {
    expect(identificarCampoFaltante(intencao({ intencao: "total_categoria_periodo" }))).toBeNull();
    expect(identificarCampoFaltante(intencao({ intencao: "fora_de_escopo" }))).toBeNull();
  });
});
