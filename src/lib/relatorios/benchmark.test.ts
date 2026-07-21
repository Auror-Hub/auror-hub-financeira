import { describe, expect, it } from "vitest";
import { montarFaixaTexto } from "./benchmark-faixa";

describe("montarFaixaTexto", () => {
  it("variação positiva descreve alta e disclaima explicitamente 'não é certo/errado'", () => {
    const texto = montarFaixaTexto(4.31, "Brasil", "2026-06");
    expect(texto).toContain("alta de 4,31%");
    expect(texto).toMatch(/não um "certo" ou "errado"/i);
  });

  it("variação negativa descreve queda", () => {
    const texto = montarFaixaTexto(-1.2, "Brasil", "2026-06");
    expect(texto).toContain("queda de 1,20%");
  });

  it("variação exatamente zero descreve estabilidade", () => {
    const texto = montarFaixaTexto(0, "Brasil", "2026-06");
    expect(texto).toContain("estabilidade de 0,00%");
  });

  it("sem dado (null) nunca inventa um percentual de variação", () => {
    const texto = montarFaixaTexto(null, "Brasil", "2026-06");
    expect(texto).toMatch(/sem variação/i);
    expect(texto).not.toContain("%");
  });

  it("sempre cita fonte, período e região explicitamente", () => {
    const texto = montarFaixaTexto(2.5, "Brasil", "2026-06");
    expect(texto).toContain("IPCA/IBGE");
    expect(texto).toContain("Brasil");
    expect(texto).toContain("2026-06");
  });
});
