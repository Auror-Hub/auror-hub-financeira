import { describe, expect, it } from "vitest";
import { pontuarCandidato, rankearCandidatos } from "./matcher";

const provisorio = { dataOcorrencia: "2026-07-10", valor: -5000, fornecedorDica: "Mercado" };

describe("pontuarCandidato", () => {
  it("valor e data exatos, sem fornecedor: pontuação máxima possível sem fornecedor", () => {
    const score = pontuarCandidato(
      { ...provisorio, fornecedorDica: null },
      { id: "1", data: "2026-07-10", valor: -5000, fornecedorOriginal: "Qualquer Loja" },
    );
    expect(score).toBe(80); // 40 (valor exato) + 40 (data exata)
  });

  it("valor, data e fornecedor todos batendo: pontuação máxima", () => {
    const score = pontuarCandidato(provisorio, { id: "1", data: "2026-07-10", valor: -5000, fornecedorOriginal: "Mercado Central" });
    expect(score).toBe(100);
  });

  it("sinais opostos (despesa vs receita) nunca pontuam por valor", () => {
    const score = pontuarCandidato(provisorio, { id: "1", data: "2026-07-10", valor: 5000, fornecedorOriginal: "Mercado" });
    expect(score).toBe(40 + 20); // data exata + fornecedor, sem pontos de valor
  });

  it("diferença de valor grande (>15%) não pontua", () => {
    const score = pontuarCandidato(provisorio, { id: "1", data: "2026-07-10", valor: -7000, fornecedorOriginal: "Outro" });
    expect(score).toBe(40); // só data exata
  });

  it("data distante (>7 dias) não pontua por data", () => {
    const score = pontuarCandidato(provisorio, { id: "1", data: "2026-07-25", valor: -5000, fornecedorOriginal: "Outro" });
    expect(score).toBe(40); // só valor exato
  });

  it("fornecedor dica vazio nunca pontua por fornecedor", () => {
    const score = pontuarCandidato({ ...provisorio, fornecedorDica: "" }, { id: "1", data: "2026-07-10", valor: -5000, fornecedorOriginal: "Mercado" });
    expect(score).toBe(80);
  });
});

describe("rankearCandidatos", () => {
  it("ordena por score desc e respeita o piso mínimo", () => {
    const candidatos = [
      { id: "ruim", data: "2026-08-01", valor: -100, fornecedorOriginal: "Nada a ver" },
      { id: "otimo", data: "2026-07-10", valor: -5000, fornecedorOriginal: "Mercado Central" },
      { id: "razoavel", data: "2026-07-11", valor: -5100, fornecedorOriginal: "Outro" },
    ];
    const rank = rankearCandidatos(provisorio, candidatos);
    expect(rank.map((r) => r.id)).toEqual(["otimo", "razoavel"]);
    expect(rank[0].score).toBeGreaterThan(rank[1].score);
  });

  it("respeita o limite máximo de candidatos", () => {
    const candidatos = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      data: "2026-07-10",
      valor: -5000,
      fornecedorOriginal: "Mercado",
    }));
    expect(rankearCandidatos(provisorio, candidatos, 3)).toHaveLength(3);
  });

  it("retorna vazio quando nenhum candidato bate o piso", () => {
    const candidatos = [{ id: "1", data: "2026-01-01", valor: -1, fornecedorOriginal: "Nada" }];
    expect(rankearCandidatos(provisorio, candidatos)).toEqual([]);
  });
});
