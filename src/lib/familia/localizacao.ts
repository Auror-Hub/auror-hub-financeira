export interface CapitalUf {
  uf: string;
  capital: string;
}

export interface ResultadoCorrespondencia {
  capitalReferencia: string;
  regraCorrespondencia: "direta" | "proxy_uf";
}

/**
 * Fase 20 (Auditoria V3.1): resolve a capital de referência DIEESE pra uma
 * cidade/UF — "direta" quando a própria cidade é a capital do estado,
 * "proxy_uf" quando não é (usa a capital como aproximação, nunca finge ser
 * o valor exato da cidade). UF fora da lista de capitais (não deveria
 * acontecer com um UF real) não tem correspondência possível.
 */
export function resolverCapitalReferencia(cidade: string, uf: string, capitais: CapitalUf[]): ResultadoCorrespondencia | null {
  const ufNormalizada = uf.trim().toUpperCase();
  const capitalDoEstado = capitais.find((c) => c.uf.toUpperCase() === ufNormalizada);
  if (!capitalDoEstado) return null;

  const cidadeNormalizada = cidade.trim().toLocaleUpperCase("pt-BR");
  const capitalNormalizada = capitalDoEstado.capital.trim().toLocaleUpperCase("pt-BR");

  return {
    capitalReferencia: capitalDoEstado.capital,
    regraCorrespondencia: cidadeNormalizada === capitalNormalizada ? "direta" : "proxy_uf",
  };
}
