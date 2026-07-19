import { describe, expect, it } from "vitest";
import { limiteInicioDoDia } from "./limites";

describe("limiteInicioDoDia", () => {
  it("zera horas/minutos/segundos/milissegundos mantendo o dia", () => {
    const referencia = new Date(2026, 6, 18, 23, 59, 59, 999);
    const inicio = limiteInicioDoDia(referencia);

    expect(inicio.getFullYear()).toBe(2026);
    expect(inicio.getMonth()).toBe(6);
    expect(inicio.getDate()).toBe(18);
    expect(inicio.getHours()).toBe(0);
    expect(inicio.getMinutes()).toBe(0);
    expect(inicio.getSeconds()).toBe(0);
    expect(inicio.getMilliseconds()).toBe(0);
  });

  it("não muta a data recebida", () => {
    const referencia = new Date(2026, 6, 18, 15, 30);
    const referenciaOriginal = referencia.getTime();
    limiteInicioDoDia(referencia);

    expect(referencia.getTime()).toBe(referenciaOriginal);
  });
});
