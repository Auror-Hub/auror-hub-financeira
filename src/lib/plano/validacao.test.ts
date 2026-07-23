import { describe, expect, it } from "vitest";
import { somarPlano, validarLinhasPlano } from "./validacao";

describe("somarPlano", () => {
  it("soma as linhas sem dupla contagem quando categorias são distintas", () => {
    const linhas = [{ valorPlanejado: 100000 }, { valorPlanejado: 50000 }, { valorPlanejado: 20000 }];
    expect(somarPlano(linhas)).toBe(170000);
  });

  it("soma zero para plano vazio", () => {
    expect(somarPlano([])).toBe(0);
  });
});

describe("validarLinhasPlano", () => {
  it("aceita linhas com categorias distintas, inclusive uma linha geral", () => {
    expect(
      validarLinhasPlano([
        { categoriaId: "cat-1", valorPlanejado: 1000, natureza: "comprometido" },
        { categoriaId: "cat-2", valorPlanejado: 2000, natureza: "protegido" },
        { categoriaId: null, valorPlanejado: 3000, natureza: "ajustavel" },
      ]),
    ).toBeNull();
  });

  it("aceita plano vazio", () => {
    expect(validarLinhasPlano([])).toBeNull();
  });

  it("rejeita duas linhas para a mesma categoria — é exatamente a dupla contagem que o plano precisa prevenir", () => {
    const erro = validarLinhasPlano([
      { categoriaId: "cat-1", valorPlanejado: 1000, natureza: "comprometido" },
      { categoriaId: "cat-1", valorPlanejado: 500, natureza: "ajustavel" },
    ]);
    expect(erro).not.toBeNull();
  });

  it("rejeita duas linhas gerais (categoriaId null repetido)", () => {
    const erro = validarLinhasPlano([
      { categoriaId: null, valorPlanejado: 1000, natureza: "reserva" },
      { categoriaId: null, valorPlanejado: 500, natureza: "reserva" },
    ]);
    expect(erro).not.toBeNull();
  });

  it("rejeita valor planejado zero ou negativo", () => {
    expect(validarLinhasPlano([{ categoriaId: "cat-1", valorPlanejado: 0, natureza: "comprometido" }])).not.toBeNull();
    expect(validarLinhasPlano([{ categoriaId: "cat-1", valorPlanejado: -100, natureza: "comprometido" }])).not.toBeNull();
  });

  it("aceita categoria + subcategoria junto com a mesma categoria sem subcategoria (alocação dentro da categoria)", () => {
    expect(
      validarLinhasPlano([
        { categoriaId: "cat-1", subcategoriaId: "sub-1", valorPlanejado: 40000, natureza: "ajustavel" },
        { categoriaId: "cat-1", subcategoriaId: "sub-2", valorPlanejado: 90000, natureza: "ajustavel" },
      ]),
    ).toBeNull();
  });

  it("rejeita subcategoria sem categoria", () => {
    const erro = validarLinhasPlano([{ categoriaId: null, subcategoriaId: "sub-1", valorPlanejado: 1000, natureza: "ajustavel" }]);
    expect(erro).not.toBeNull();
  });

  it("rejeita duas linhas para o mesmo par categoria+subcategoria", () => {
    const erro = validarLinhasPlano([
      { categoriaId: "cat-1", subcategoriaId: "sub-1", valorPlanejado: 1000, natureza: "ajustavel" },
      { categoriaId: "cat-1", subcategoriaId: "sub-1", valorPlanejado: 500, natureza: "ajustavel" },
    ]);
    expect(erro).not.toBeNull();
  });
});
