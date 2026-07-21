import { describe, expect, it } from "vitest";
import { priorizarSinais } from "./sinais";
import type { LinhaMatriz } from "./matriz";

function linha(overrides: Partial<LinhaMatriz>): LinhaMatriz {
  return {
    categoriaId: "cat-1",
    categoriaRotulo: "Categoria",
    planejado: 100000,
    realizado: 100000,
    desvioReais: 0,
    desvioPercentual: 0,
    tendencia: null,
    natureza: "ajustavel",
    situacao: "dentro",
    ...overrides,
  };
}

describe("priorizarSinais", () => {
  it("categoria excedida e ajustável aparece como sinal", () => {
    const matriz = [
      linha({
        categoriaId: "cat-1",
        categoriaRotulo: "Restaurante",
        planejado: 100000,
        realizado: 150000,
        desvioReais: 50000,
        desvioPercentual: 0.5,
        natureza: "ajustavel",
        situacao: "excedido",
      }),
    ];

    const sinais = priorizarSinais(matriz);

    expect(sinais).toHaveLength(1);
    expect(sinais[0].categoriaId).toBe("cat-1");
    expect(sinais[0].porque).toMatch(/Excedeu o plano em 50%/);
  });

  it("descarta sinal por baixa materialidade apesar de desvio percentual alto", () => {
    const matriz = [
      linha({
        categoriaId: "cat-1",
        categoriaRotulo: "Café",
        planejado: 1000,
        realizado: 5000,
        desvioReais: 4000, // R$40 — abaixo do piso de R$100
        desvioPercentual: 4,
        natureza: "ajustavel",
        situacao: "excedido",
      }),
    ];

    expect(priorizarSinais(matriz)).toHaveLength(0);
  });

  it("categoria protegida nunca gera sinal, mesmo excedida e de alto impacto", () => {
    const matriz = [
      linha({
        categoriaId: "cat-1",
        categoriaRotulo: "Aluguel",
        planejado: 200000,
        realizado: 300000,
        desvioReais: 100000,
        desvioPercentual: 0.5,
        natureza: "protegido",
        situacao: "excedido",
      }),
    ];

    expect(priorizarSinais(matriz)).toHaveLength(0);
  });

  it("categoria sem plano (situação sem_plano) nunca gera sinal", () => {
    const matriz = [
      linha({
        categoriaId: "cat-1",
        planejado: null,
        realizado: 500000,
        desvioReais: null,
        desvioPercentual: null,
        natureza: null,
        situacao: "sem_plano",
      }),
    ];

    expect(priorizarSinais(matriz)).toHaveLength(0);
  });

  it("categoria dentro do plano nunca gera sinal", () => {
    const matriz = [linha({ situacao: "dentro" })];
    expect(priorizarSinais(matriz)).toHaveLength(0);
  });

  it("limita a no máximo 3 sinais, priorizando maior score", () => {
    const matriz: LinhaMatriz[] = ["cat-1", "cat-2", "cat-3", "cat-4"].map((id, i) =>
      linha({
        categoriaId: id,
        categoriaRotulo: id,
        planejado: 100000,
        realizado: 100000 + (i + 1) * 50000,
        desvioReais: (i + 1) * 50000,
        desvioPercentual: (i + 1) * 0.5,
        natureza: "ajustavel",
        situacao: "excedido",
      }),
    );

    const sinais = priorizarSinais(matriz);

    expect(sinais).toHaveLength(3);
    // cat-4 tem o maior impacto/desvio — deve estar entre os priorizados, cat-1 (menor) descartado.
    expect(sinais.map((s) => s.categoriaId)).toContain("cat-4");
    expect(sinais.map((s) => s.categoriaId)).not.toContain("cat-1");
  });

  it("recorrência em meses anteriores aumenta a prioridade do sinal", () => {
    const base = linha({
      categoriaId: "cat-1",
      categoriaRotulo: "Recorrente",
      planejado: 100000,
      realizado: 150000,
      desvioReais: 50000,
      desvioPercentual: 0.5,
      natureza: "ajustavel",
      situacao: "excedido",
    });

    const semHistorico = priorizarSinais([base]);
    const comHistorico = priorizarSinais([base], new Map([["cat-1", 2]]));

    expect(comHistorico[0].porque).toMatch(/recorrente há 3 meses/);
    expect(semHistorico[0].porque).not.toMatch(/recorrente/);
  });
});
