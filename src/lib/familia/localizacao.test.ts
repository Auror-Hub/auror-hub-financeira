import { describe, expect, it } from "vitest";
import { resolverCapitalReferencia } from "./localizacao";

const CAPITAIS = [
  { uf: "SP", capital: "São Paulo" },
  { uf: "MG", capital: "Belo Horizonte" },
  { uf: "RJ", capital: "Rio de Janeiro" },
];

describe("resolverCapitalReferencia", () => {
  it("cidade igual à capital do estado → correspondência direta", () => {
    const resultado = resolverCapitalReferencia("São Paulo", "SP", CAPITAIS);
    expect(resultado).toEqual({ capitalReferencia: "São Paulo", regraCorrespondencia: "direta" });
  });

  it("cidade diferente da capital do estado → proxy_uf", () => {
    const resultado = resolverCapitalReferencia("Campinas", "SP", CAPITAIS);
    expect(resultado).toEqual({ capitalReferencia: "São Paulo", regraCorrespondencia: "proxy_uf" });
  });

  it("ignora espaços e caixa ao comparar cidade com a capital", () => {
    const resultado = resolverCapitalReferencia("  belo horizonte  ", "mg", CAPITAIS);
    expect(resultado).toEqual({ capitalReferencia: "Belo Horizonte", regraCorrespondencia: "direta" });
  });

  it("UF sem capital cadastrada retorna null", () => {
    expect(resolverCapitalReferencia("Qualquer Cidade", "ZZ", CAPITAIS)).toBeNull();
  });
});
