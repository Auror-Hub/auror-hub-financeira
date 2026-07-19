import { describe, expect, it } from "vitest";
import { calcularCompetencia, diasRestantesNoMes } from "./competencia";

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
