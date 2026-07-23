/**
 * Fase 15 (Auditoria V3.1): dedup por multiconjunto, não por presença binária.
 * Reimportar uma fatura "atualizada" (mesmas linhas de antes + algumas novas)
 * não deve duplicar as que já existem — mas duas compras genuinamente iguais
 * no mesmo dia (mesmo fornecedor, mesmo valor) precisam continuar sendo
 * preservadas as duas. A regra: se já existem N lançamentos com uma
 * `identificador_deduplicacao`, as N primeiras ocorrências dessa MESMA chave
 * nesta importação são repetição esperada (não inserir); só o excedente é
 * novo. Puro — nunca toca rede/banco, só decide o que fazer com cada linha.
 */
export function resolverExcedenteMulticonjunto(chaves: string[], existentesPorChave: Map<string, number>): boolean[] {
  const vistosNestaImportacao = new Map<string, number>();
  return chaves.map((chave) => {
    const posicao = (vistosNestaImportacao.get(chave) ?? 0) + 1;
    vistosNestaImportacao.set(chave, posicao);
    const existentes = existentesPorChave.get(chave) ?? 0;
    return posicao > existentes;
  });
}
