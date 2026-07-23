import { describe, expect, it } from "vitest";
import { calcularCompetencia, calcularEstadoCiclo, diasDecorridosNoMes, diasRestantesNoMes, mesesAnteriores, proximoMes } from "./competencia";

describe("calcularCompetencia", () => {
  it("extrai o mês (AAAA-MM) de uma data ISO completa", () => {
    expect(calcularCompetencia("2026-07-18")).toBe("2026-07");
  });

  it("funciona no início e no fim do mês", () => {
    expect(calcularCompetencia("2026-01-01")).toBe("2026-01");
    expect(calcularCompetencia("2026-12-31")).toBe("2026-12");
  });
});

describe("diasRestantesNoMes", () => {
  it("calcula dias restantes quando a competência é o mês corrente", () => {
    expect(diasRestantesNoMes("2026-07", new Date("2026-07-18T12:00:00Z"))).toBe(13);
  });

  it("retorna 0 no último dia do mês", () => {
    expect(diasRestantesNoMes("2026-07", new Date("2026-07-31T12:00:00Z"))).toBe(0);
  });

  it("considera fevereiro bissexto", () => {
    expect(diasRestantesNoMes("2028-02", new Date("2028-02-01T12:00:00Z"))).toBe(28);
  });

  it("retorna null quando a competência não é o mês corrente", () => {
    expect(diasRestantesNoMes("2026-06", new Date("2026-07-18T12:00:00Z"))).toBeNull();
    expect(diasRestantesNoMes("2026-08", new Date("2026-07-18T12:00:00Z"))).toBeNull();
  });
});

describe("diasDecorridosNoMes", () => {
  it("calcula decorridos e total quando é o mês corrente", () => {
    expect(diasDecorridosNoMes("2026-07", new Date("2026-07-18T12:00:00Z"))).toEqual({ decorridos: 18, total: 31 });
  });

  it("retorna null quando não é o mês corrente", () => {
    expect(diasDecorridosNoMes("2026-06", new Date("2026-07-18T12:00:00Z"))).toBeNull();
  });
});

describe("mesesAnteriores", () => {
  it("gera os N meses anteriores, mais recente primeiro", () => {
    expect(mesesAnteriores("2026-07", 3)).toEqual(["2026-06", "2026-05", "2026-04"]);
  });

  it("atravessa virada de ano", () => {
    expect(mesesAnteriores("2026-02", 3)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });

  it("funciona com quantidade 1 e 12", () => {
    expect(mesesAnteriores("2026-07", 1)).toEqual(["2026-06"]);
    expect(mesesAnteriores("2026-07", 12)).toHaveLength(12);
    expect(mesesAnteriores("2026-07", 12)[11]).toBe("2025-07");
  });
});

describe("calcularEstadoCiclo", () => {
  it("com pendências, é 'em revisão' independente de estar em andamento", () => {
    expect(calcularEstadoCiclo(3, true)).toBe("em revisão");
    expect(calcularEstadoCiclo(3, false)).toBe("em revisão");
  });

  it("sem pendências e em andamento (mês atual), é 'atualizada' — nunca 'pronta'", () => {
    expect(calcularEstadoCiclo(0, true)).toBe("atualizada");
  });

  it("sem pendências e não em andamento (mês passado), é 'pronta'", () => {
    expect(calcularEstadoCiclo(0, false)).toBe("pronta");
  });
});

describe("proximoMes", () => {
  it("avança um mês dentro do mesmo ano", () => {
    expect(proximoMes("2026-06")).toBe("2026-07");
  });

  it("atravessa virada de ano", () => {
    expect(proximoMes("2026-12")).toBe("2027-01");
  });
});
