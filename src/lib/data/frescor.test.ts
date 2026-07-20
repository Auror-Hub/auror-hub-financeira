import { describe, expect, it } from "vitest";
import { classificarFrescor, diasDesde, rotuloFrescor } from "./frescor";

describe("classificarFrescor", () => {
  it("é 'fechada' para competência fechada ou reaberta, independente de ultimaAtualizacao", () => {
    expect(classificarFrescor("fechada", null, new Date("2026-07-18T12:00:00Z"))).toBe("fechada");
    expect(classificarFrescor("reaberta", "2026-06-01T00:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe("fechada");
  });

  it("é 'desatualizada' para competência aberta sem nenhum lançamento", () => {
    expect(classificarFrescor("pronta", null, new Date("2026-07-18T12:00:00Z"))).toBe("desatualizada");
  });

  it("é 'parcial_atualizada' quando o último lançamento é recente (dentro do limiar)", () => {
    expect(classificarFrescor("em revisão", "2026-07-16T12:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe("parcial_atualizada");
  });

  it("é 'desatualizada' quando o último lançamento passou do limiar de dias", () => {
    expect(classificarFrescor("em revisão", "2026-07-01T12:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe("desatualizada");
  });

  it("trata exatamente o limiar (3 dias) como ainda recente", () => {
    expect(classificarFrescor("pronta", "2026-07-15T12:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe("parcial_atualizada");
  });
});

describe("diasDesde", () => {
  it("calcula dias inteiros decorridos", () => {
    expect(diasDesde("2026-07-15T12:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe(3);
  });

  it("nunca retorna negativo mesmo com data futura", () => {
    expect(diasDesde("2026-07-20T12:00:00Z", new Date("2026-07-18T12:00:00Z"))).toBe(0);
  });
});

describe("rotuloFrescor", () => {
  it("texto fixo para fechada", () => {
    expect(rotuloFrescor("fechada", "2026-07-01T00:00:00Z", new Date("2026-07-18T00:00:00Z"))).toBe("Mês fechado");
  });

  it("texto para mês aberto sem lançamentos", () => {
    expect(rotuloFrescor("desatualizada", null, new Date("2026-07-18T00:00:00Z"))).toBe("Mês aberto — sem lançamentos ainda");
  });

  it("texto para parcial atualizado hoje", () => {
    expect(rotuloFrescor("parcial_atualizada", "2026-07-18T08:00:00Z", new Date("2026-07-18T20:00:00Z"))).toBe("Mês parcial — atualizado hoje");
  });

  it("texto para desatualizado com dias", () => {
    expect(rotuloFrescor("desatualizada", "2026-07-01T00:00:00Z", new Date("2026-07-18T00:00:00Z"))).toBe(
      "Mês parcial — desatualizado, última atualização há 17 dias",
    );
  });
});
