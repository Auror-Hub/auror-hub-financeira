import { describe, expect, it } from "vitest";
import { agregarLancamentos, agregarPorChave } from "./agregador";

describe("agregarLancamentos", () => {
  it("reproduz o cenário da Auditoria V3.1: despesas + 1 crédito não pode virar gasto extra", () => {
    // R$19.954,90 em despesas (negativo) + R$70,03 de crédito/estorno (positivo).
    const lancamentos = [{ valor: -1995490 }, { valor: 7003 }];
    const resultado = agregarLancamentos(lancamentos);
    expect(resultado.gastoBruto).toBe(1995490);
    expect(resultado.creditos).toBe(7003);
    expect(resultado.gastoLiquido).toBe(1995490 - 7003); // 19.884,87 — nunca 20.024,93 (bruto+2×crédito)
    expect(resultado.quantidadeDeGastos).toBe(1);
  });

  it("só despesas: gastoLiquido = gastoBruto, creditos = 0", () => {
    const resultado = agregarLancamentos([{ valor: -1000 }, { valor: -2000 }]);
    expect(resultado).toEqual({ gastoBruto: 3000, creditos: 0, gastoLiquido: 3000, quantidadeDeGastos: 2 });
  });

  it("só créditos: gastoLiquido fica negativo (mês de reembolso líquido, sem despesa)", () => {
    const resultado = agregarLancamentos([{ valor: 500 }]);
    expect(resultado).toEqual({ gastoBruto: 0, creditos: 500, gastoLiquido: -500, quantidadeDeGastos: 0 });
  });

  it("lista vazia produz tudo zero", () => {
    expect(agregarLancamentos([])).toEqual({ gastoBruto: 0, creditos: 0, gastoLiquido: 0, quantidadeDeGastos: 0 });
  });

  it("valor zero não conta nem como despesa nem como crédito", () => {
    const resultado = agregarLancamentos([{ valor: 0 }, { valor: -100 }]);
    expect(resultado.gastoLiquido).toBe(100);
    expect(resultado.quantidadeDeGastos).toBe(1);
  });
});

describe("agregarPorChave", () => {
  it("agrega separadamente por chave, ignorando itens com chave nula", () => {
    const lancamentos = [
      { valor: -1000, categoriaId: "a" },
      { valor: 200, categoriaId: "a" },
      { valor: -500, categoriaId: "b" },
      { valor: -999, categoriaId: null },
    ];
    const resultado = agregarPorChave(lancamentos, (l) => l.categoriaId);
    expect(resultado.get("a")?.gastoLiquido).toBe(800); // 1000 - 200
    expect(resultado.get("b")?.gastoLiquido).toBe(500);
    expect(resultado.has("null")).toBe(false);
    expect(resultado.size).toBe(2);
  });
});
