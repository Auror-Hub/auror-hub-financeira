import { describe, expect, it } from "vitest";
import { montarMatrizControle } from "./matriz";
import type { PainelControle, CategoriaBreakdown } from "./consulta";
import type { PlanoMensal } from "@/lib/plano/consulta";

function categoria(overrides: Partial<CategoriaBreakdown>): CategoriaBreakdown {
  return {
    categoriaId: "cat-1",
    rotulo: "Categoria",
    total: 0,
    percentualDoTotal: 0,
    variacaoVsAnterior: null,
    subcategorias: [],
    topFornecedores: [],
    ...overrides,
  };
}

function painelCom(categorias: CategoriaBreakdown[]): PainelControle {
  return {
    periodo: { rotulo: "Julho de 2026" },
    total: categorias.reduce((s, c) => s + c.total, 0),
    totalLancamentos: categorias.length,
    ticketMedio: 0,
    comparacao: null,
    categorias,
    pressionadas: [],
    extraordinarias: [],
    porObjetivo: [],
    porMes: [],
  };
}

function planoCom(linhas: PlanoMensal["linhas"]): PlanoMensal {
  return {
    id: "plano-1",
    mesReferencia: "2026-07",
    rendaInformada: null,
    linhas,
    total: linhas.reduce((s, l) => s + l.valorPlanejado, 0),
    naoAlocado: null,
  };
}

describe("montarMatrizControle", () => {
  it("categoria sem linha de plano entra com planejado null e situação sem_plano", () => {
    const painel = painelCom([categoria({ categoriaId: "cat-1", rotulo: "Lazer", total: 50000 })]);
    const plano = planoCom([]);

    const [linha] = montarMatrizControle(painel, plano);

    expect(linha.planejado).toBeNull();
    expect(linha.situacao).toBe("sem_plano");
    expect(linha.natureza).toBeNull();
  });

  it("categoria dentro do plano (abaixo de 80% do planejado) fica com situação dentro", () => {
    const painel = painelCom([categoria({ categoriaId: "cat-1", rotulo: "Mercado", total: 30000 })]);
    const plano = planoCom([
      { id: "l1", categoriaId: "cat-1", categoriaRotulo: "Mercado", valorPlanejado: 100000, natureza: "ajustavel" },
    ]);

    const [linha] = montarMatrizControle(painel, plano);

    expect(linha.planejado).toBe(100000);
    expect(linha.desvioReais).toBe(-70000);
    expect(linha.situacao).toBe("dentro");
  });

  it("categoria que excedeu o planejado fica com situação excedido e desvio positivo", () => {
    const painel = painelCom([categoria({ categoriaId: "cat-1", rotulo: "Restaurante", total: 150000 })]);
    const plano = planoCom([
      { id: "l1", categoriaId: "cat-1", categoriaRotulo: "Restaurante", valorPlanejado: 100000, natureza: "ajustavel" },
    ]);

    const [linha] = montarMatrizControle(painel, plano);

    expect(linha.desvioReais).toBe(50000);
    expect(linha.desvioPercentual).toBeCloseTo(0.5);
    expect(linha.situacao).toBe("excedido");
  });

  it("categoria entre 80% e 100% do planejado fica em atenção", () => {
    const painel = painelCom([categoria({ categoriaId: "cat-1", rotulo: "Transporte", total: 85000 })]);
    const plano = planoCom([
      { id: "l1", categoriaId: "cat-1", categoriaRotulo: "Transporte", valorPlanejado: 100000, natureza: "comprometido" },
    ]);

    const [linha] = montarMatrizControle(painel, plano);

    expect(linha.situacao).toBe("atencao");
  });

  it("linha de plano sem gasto realizado entra como situação dentro, realizado zero", () => {
    const painel = painelCom([]);
    const plano = planoCom([
      { id: "l1", categoriaId: "cat-2", categoriaRotulo: "Viagem", valorPlanejado: 200000, natureza: "reserva" },
    ]);

    const [linha] = montarMatrizControle(painel, plano);

    expect(linha.realizado).toBe(0);
    expect(linha.situacao).toBe("dentro");
    expect(linha.planejado).toBe(200000);
  });

  it("linha 'geral' do plano (categoriaId null) não entra na matriz", () => {
    const painel = painelCom([]);
    const plano = planoCom([{ id: "l1", categoriaId: null, categoriaRotulo: "Outras / geral", valorPlanejado: 300000, natureza: "reserva" }]);

    expect(montarMatrizControle(painel, plano)).toHaveLength(0);
  });
});
