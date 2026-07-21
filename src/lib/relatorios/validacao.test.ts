import { describe, expect, it } from "vitest";
import { validarRelatorio } from "./validacao";

describe("validarRelatorio", () => {
  it("passa quando todo valor citado está entre os valores conhecidos", () => {
    const texto = "O total do mês foi R$ 3.400,00, um aumento de 12% frente ao mês anterior.";
    const resultado = validarRelatorio(texto, ["R$ 3.400,00", "12%"]);
    expect(resultado.valido).toBe(true);
    expect(resultado.avisos).toHaveLength(0);
  });

  it("falha quando um valor monetário citado não está nos valores conhecidos", () => {
    const texto = "O total do mês foi R$ 9.999,99.";
    const resultado = validarRelatorio(texto, ["R$ 3.400,00"]);
    expect(resultado.valido).toBe(false);
    expect(resultado.avisos[0]).toMatch(/R\$ 9\.999,99/);
  });

  it("falha quando um percentual citado não está nos valores conhecidos", () => {
    const texto = "As categorias pressionadas subiram 999% no período.";
    const resultado = validarRelatorio(texto, ["R$ 3.400,00"]);
    expect(resultado.valido).toBe(false);
    expect(resultado.avisos.some((a) => a.includes("999%"))).toBe(true);
  });

  it("texto sem nenhum número monetário/percentual é sempre válido", () => {
    const resultado = validarRelatorio("Ainda não há dados suficientes para esta seção.", []);
    expect(resultado.valido).toBe(true);
  });

  it("valor negativo é reconhecido corretamente", () => {
    const texto = "O saldo ficou em -R$ 150,00 no período.";
    const resultado = validarRelatorio(texto, ["-R$ 150,00"]);
    expect(resultado.valido).toBe(true);
  });

  it("citar o mesmo valor sem o sinal de negativo não conta como divergência", () => {
    const texto = "A família registrou despesas de R$ 4.150,00 em julho.";
    const resultado = validarRelatorio(texto, ["-R$ 4.150,00"]);
    expect(resultado.valido).toBe(true);
  });

  it("valor conhecido sem sinal também reconhece a versão citada com sinal", () => {
    const texto = "O total consolidado foi de -R$ 4.150,00.";
    const resultado = validarRelatorio(texto, ["R$ 4.150,00"]);
    expect(resultado.valido).toBe(true);
  });

  it("reconhece o mesmo valor mesmo quando o espaço entre 'R$' e o número difere (NBSP vs. espaço comum)", () => {
    // formatBRL (Intl.NumberFormat) usa espaço não-quebrável (U+00A0); a API pode reproduzir espaço comum.
    const conhecidoComNbsp = `R$ 100,00`;
    const texto = "O limite da meta é R$ 100,00.";
    const resultado = validarRelatorio(texto, [conhecidoComNbsp]);
    expect(resultado.valido).toBe(true);
  });
});
