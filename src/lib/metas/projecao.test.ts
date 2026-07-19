import { describe, expect, it } from "vitest";
import { calcularProjecao } from "./projecao";

describe("calcularProjecao", () => {
  it("projeta linearmente pelo ritmo diário", () => {
    const r = calcularProjecao(50000, 10, 30);
    expect(r?.estimativa).toBe(150000);
  });

  it("aplica margem de incerteza de ±15%", () => {
    const r = calcularProjecao(100000, 10, 30);
    expect(r?.estimativa).toBe(300000);
    expect(r?.minimo).toBe(255000);
    expect(r?.maximo).toBe(345000);
  });

  it("retorna null sem dias decorridos ou sem dias no mês", () => {
    expect(calcularProjecao(1000, 0, 30)).toBeNull();
    expect(calcularProjecao(1000, 10, 0)).toBeNull();
  });

  it("gasto zero projeta zero", () => {
    const r = calcularProjecao(0, 15, 30);
    expect(r).toEqual({ estimativa: 0, minimo: 0, maximo: 0 });
  });
});
