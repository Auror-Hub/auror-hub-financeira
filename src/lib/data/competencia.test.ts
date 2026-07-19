import { describe, expect, it } from "vitest";
import { calcularCompetencia } from "./competencia";

describe("calcularCompetencia", () => {
  it("extrai o mês (AAAA-MM) de uma data ISO completa", () => {
    expect(calcularCompetencia("2026-07-18")).toBe("2026-07");
  });

  it("funciona no início e no fim do mês", () => {
    expect(calcularCompetencia("2026-01-01")).toBe("2026-01");
    expect(calcularCompetencia("2026-12-31")).toBe("2026-12");
  });
});
