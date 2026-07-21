import { describe, expect, it } from "vitest";
import { montarRegistros } from "./atualizar-ipca";

describe("montarRegistros", () => {
  it("agrupa variação mensal e 12m da mesma categoria/período num único registro", () => {
    const linhas = [
      { V: "0.16", D2C: "63", D3C: "202606", D4C: "7169" },
      { V: "4.31", D2C: "2265", D3C: "202606", D4C: "7169" },
    ];

    const registros = montarRegistros(linhas);

    expect(registros).toHaveLength(1);
    expect(registros[0]).toEqual({
      fonte: "IBGE-SIDRA-7060",
      categoria_ibge: "geral",
      regiao: "Brasil",
      periodo_referencia: "2026-06",
      variacao_mensal: 0.16,
      variacao_12m: 4.31,
    });
  });

  it("monta um registro por categoria quando várias vêm no mesmo período", () => {
    const linhas = [
      { V: "0.16", D2C: "63", D3C: "202606", D4C: "7169" },
      { V: "-0.24", D2C: "63", D3C: "202606", D4C: "7170" },
    ];

    const registros = montarRegistros(linhas);

    expect(registros).toHaveLength(2);
    expect(registros.find((r) => r.categoria_ibge === "geral")?.variacao_mensal).toBe(0.16);
    expect(registros.find((r) => r.categoria_ibge === "alimentacao_bebidas")?.variacao_mensal).toBe(-0.24);
  });

  it("ignora categoria fora do mapa conhecido, sem inventar rótulo", () => {
    const linhas = [{ V: "1.0", D2C: "63", D3C: "202606", D4C: "9999" }];
    expect(montarRegistros(linhas)).toHaveLength(0);
  });

  it("valor não numérico (ex.: SIDRA usa '...' para dado ausente) vira null, nunca 0 ou NaN", () => {
    const linhas = [{ V: "...", D2C: "63", D3C: "202606", D4C: "7169" }];
    const registros = montarRegistros(linhas);
    expect(registros[0].variacao_mensal).toBeNull();
  });

  it("array vazio produz nenhum registro", () => {
    expect(montarRegistros([])).toHaveLength(0);
  });
});
