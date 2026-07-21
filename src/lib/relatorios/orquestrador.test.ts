import { describe, expect, it } from "vitest";
import { selecionarModulos, type PacoteDadosRelatorio } from "./orquestrador";

function pacoteBase(overrides: Partial<PacoteDadosRelatorio> = {}): PacoteDadosRelatorio {
  return {
    totalLancamentos: 10,
    coberturaClassificacao: 1,
    temInsightDeVariacaoCategoria: false,
    existeCompetenciaAnteriorFechada: false,
    rendaInformada: null,
    consentimentoComparacaoExterna: false,
    ...overrides,
  };
}

function slugs(pacote: PacoteDadosRelatorio): string[] {
  return selecionarModulos(pacote).map((m) => m.slug);
}

describe("selecionarModulos", () => {
  it("núcleo sempre entra, mesmo com pacote mínimo (sem nenhum módulo condicional elegível)", () => {
    const resultado = selecionarModulos(pacoteBase({ totalLancamentos: 0, coberturaClassificacao: 0 }));
    expect(resultado.map((m) => m.slug)).toEqual(["resumo_executivo", "fechamento_do_mes", "o_que_mudou", "metas_e_decisoes", "proximo_ciclo"]);
    expect(resultado.every((m) => m.nucleo)).toBe(true);
  });

  it("sem renda informada, módulo de renda e saúde não entra", () => {
    expect(slugs(pacoteBase({ rendaInformada: null }))).not.toContain("renda_e_saude");
  });

  it("com renda informada, módulo de renda e saúde entra", () => {
    expect(slugs(pacoteBase({ rendaInformada: 500000 }))).toContain("renda_e_saude");
  });

  it("sem consentimento de comparação externa, benchmark não entra", () => {
    expect(slugs(pacoteBase({ consentimentoComparacaoExterna: false }))).not.toContain("benchmark_externo");
  });

  it("com consentimento de comparação externa, benchmark entra", () => {
    expect(slugs(pacoteBase({ consentimentoComparacaoExterna: true }))).toContain("benchmark_externo");
  });

  it("cobertura de classificação baixa, composição não entra", () => {
    expect(slugs(pacoteBase({ coberturaClassificacao: 0.2 }))).not.toContain("composicao");
  });

  it("cobertura de classificação suficiente, composição entra", () => {
    expect(slugs(pacoteBase({ coberturaClassificacao: 0.8 }))).toContain("composicao");
  });

  it("sem lançamentos, composição não entra mesmo com cobertura nominal alta", () => {
    expect(slugs(pacoteBase({ totalLancamentos: 0, coberturaClassificacao: 1 }))).not.toContain("composicao");
  });

  it("sem insight de variação de categoria, fora do padrão não entra", () => {
    expect(slugs(pacoteBase({ temInsightDeVariacaoCategoria: false }))).not.toContain("fora_do_padrao");
  });

  it("com insight de variação de categoria, fora do padrão entra", () => {
    expect(slugs(pacoteBase({ temInsightDeVariacaoCategoria: true }))).toContain("fora_do_padrao");
  });

  it("sem competência anterior fechada, comparação histórica não entra", () => {
    expect(slugs(pacoteBase({ existeCompetenciaAnteriorFechada: false }))).not.toContain("comparacao_historica");
  });

  it("com competência anterior fechada, comparação histórica entra", () => {
    expect(slugs(pacoteBase({ existeCompetenciaAnteriorFechada: true }))).toContain("comparacao_historica");
  });
});
