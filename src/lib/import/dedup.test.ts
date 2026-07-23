import { describe, expect, it } from "vitest";
import { resolverExcedenteMulticonjunto } from "./dedup";

describe("resolverExcedenteMulticonjunto", () => {
  it("reimportar fatura atualizada: 20 já existentes + 5 novas insere só as 5", () => {
    const existentesPorChave = new Map<string, number>();
    const chaves: string[] = [];
    for (let i = 0; i < 20; i++) {
      const chave = `existente-${i}`;
      existentesPorChave.set(chave, 1);
      chaves.push(chave);
    }
    for (let i = 0; i < 5; i++) chaves.push(`nova-${i}`);

    const resultado = resolverExcedenteMulticonjunto(chaves, existentesPorChave);
    expect(resultado.filter(Boolean)).toHaveLength(5);
    expect(resultado.slice(0, 20).every((v) => v === false)).toBe(true);
    expect(resultado.slice(20).every((v) => v === true)).toBe(true);
  });

  it("duplicata legítima (duas compras iguais no mesmo dia, primeira vez importadas): ambas entram", () => {
    const chaves = ["mesma-compra", "mesma-compra"];
    const resultado = resolverExcedenteMulticonjunto(chaves, new Map());
    expect(resultado).toEqual([true, true]);
  });

  it("reimportar exatamente a mesma fatura sem novidade: nada é inserido de novo", () => {
    const existentesPorChave = new Map([["chave-a", 1]]);
    const resultado = resolverExcedenteMulticonjunto(["chave-a"], existentesPorChave);
    expect(resultado).toEqual([false]);
  });

  it("excedente real além do histórico conhecido: só a ocorrência extra é inserida", () => {
    // Já existem 2 (duplicatas legítimas antigas); esta importação traz 3 —
    // as 2 primeiras são as mesmas de sempre, a 3ª é genuinamente nova.
    const existentesPorChave = new Map([["chave-b", 2]]);
    const resultado = resolverExcedenteMulticonjunto(["chave-b", "chave-b", "chave-b"], existentesPorChave);
    expect(resultado).toEqual([false, false, true]);
  });

  it("lista vazia não quebra", () => {
    expect(resolverExcedenteMulticonjunto([], new Map())).toEqual([]);
  });
});
