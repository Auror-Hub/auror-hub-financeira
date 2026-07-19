import { describe, expect, it } from "vitest";
import { avaliarProgresso, gerarAlerta } from "./avaliacao";
import { formatBRL } from "@/lib/format";

describe("avaliarProgresso", () => {
  it("status ok abaixo de 80%", () => {
    const r = avaliarProgresso(10000, 5000);
    expect(r.percentual).toBeCloseTo(0.5);
    expect(r.status).toBe("ok");
  });

  it("status atencao entre 80% e 100%", () => {
    const r = avaliarProgresso(10000, 8500);
    expect(r.percentual).toBeCloseTo(0.85);
    expect(r.status).toBe("atencao");
  });

  it("status estourada a partir de 100%", () => {
    const r = avaliarProgresso(10000, 10000);
    expect(r.status).toBe("estourada");
  });

  it("estourada acima de 100%", () => {
    const r = avaliarProgresso(5000, 12500);
    expect(r.percentual).toBeCloseTo(2.5);
    expect(r.status).toBe("estourada");
  });

  it("limite zero não gera divisão por zero", () => {
    const r = avaliarProgresso(0, 100);
    expect(r.percentual).toBe(0);
    expect(r.status).toBe("ok");
  });
});

describe("gerarAlerta", () => {
  it("retorna null quando status é ok", () => {
    const alerta = gerarAlerta("Alimentação", 10000, 5000, { percentual: 0.5, status: "ok" });
    expect(alerta).toBeNull();
  });

  it("tom atenção entre 80% e 100%, sem inventar excedente", () => {
    const alerta = gerarAlerta("Alimentação", 10000, 8500, { percentual: 0.85, status: "atencao" });
    expect(alerta?.tom).toBe("atenção");
    expect(alerta?.texto).toContain("85%");
  });

  it("tom risco quando estourada, com excedente calculado", () => {
    const alerta = gerarAlerta("Alimentação", 10000, 12500, { percentual: 1.25, status: "estourada" });
    expect(alerta?.tom).toBe("risco");
    expect(alerta?.texto).toContain(formatBRL(2500));
  });
});
