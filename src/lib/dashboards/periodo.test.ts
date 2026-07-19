import { describe, expect, it } from "vitest";
import { resolverPeriodoEAnterior } from "./periodo";

describe("resolverPeriodoEAnterior — tipo competencias", () => {
  it("um único mês: rótulo é o mês, anterior é o mês imediatamente antes", () => {
    const r = resolverPeriodoEAnterior({ tipo: "competencias", meses: ["2026-07"] });
    expect(r.rotulo).toBe("Julho de 2026");
    expect(r.anterior).toEqual({ tipo: "competencias", meses: ["2026-06"] });
    expect(r.rotuloAnterior).toBe("Junho de 2026");
  });

  it("vários meses: rótulo é o intervalo, anterior tem a mesma quantidade de meses", () => {
    const r = resolverPeriodoEAnterior({ tipo: "competencias", meses: ["2026-05", "2026-06", "2026-07"] });
    expect(r.rotulo).toBe("Maio de 2026 – Julho de 2026");
    expect(r.anterior).toEqual({ tipo: "competencias", meses: ["2026-04", "2026-03", "2026-02"] });
    expect(r.rotuloAnterior).toBe("Fevereiro de 2026 – Abril de 2026");
  });

  it("atravessa virada de ano", () => {
    const r = resolverPeriodoEAnterior({ tipo: "competencias", meses: ["2026-01", "2026-02"] });
    expect(r.anterior).toEqual({ tipo: "competencias", meses: ["2025-12", "2025-11"] });
  });
});

describe("resolverPeriodoEAnterior — tipo datas", () => {
  it("calcula o período anterior de mesma duração, imediatamente antes", () => {
    const r = resolverPeriodoEAnterior({ tipo: "datas", dataInicio: "2026-07-01", dataFim: "2026-07-10" });
    expect(r.anterior).toEqual({ tipo: "datas", dataInicio: "2026-06-21", dataFim: "2026-06-30" });
  });

  it("rótulo usa formatData nos dois períodos", () => {
    const r = resolverPeriodoEAnterior({ tipo: "datas", dataInicio: "2026-07-01", dataFim: "2026-07-10" });
    expect(r.rotulo).toBe("01/07/2026 – 10/07/2026");
    expect(r.rotuloAnterior).toBe("21/06/2026 – 30/06/2026");
  });
});
