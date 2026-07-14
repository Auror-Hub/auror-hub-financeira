/**
 * Taxonomia sintética (ENT-TAXONOMY-TERM) — vocabulário de exemplo para a
 * Etapa 1. Termos de "objetivo" usam rótulos genéricos (Pessoal, Família,
 * Trabalho...), não nomes de pessoa, para não reproduzir os exemplos do
 * blueprint nem inventar dados pessoais.
 */
import type { TermoTaxonomia } from "@/lib/domain/types";

function termo(
  id: string,
  dimensao: TermoTaxonomia["dimensao"],
  rotulo: string,
  termoPaiId?: string,
): TermoTaxonomia {
  return { id, dimensao, rotulo, termoPaiId, status: "ativo", origem: "padrão do sistema" };
}

export const TAXONOMIA: TermoTaxonomia[] = [
  // categoria
  termo("cat-casa", "categoria", "Casa"),
  termo("cat-alimentacao", "categoria", "Alimentação"),
  termo("cat-saude", "categoria", "Saúde"),
  termo("cat-transporte", "categoria", "Transporte"),
  termo("cat-lazer", "categoria", "Lazer"),

  // subcategoria (com termo pai)
  termo("sub-manutencao", "subcategoria", "Manutenção", "cat-casa"),
  termo("sub-restaurantes", "subcategoria", "Restaurantes", "cat-alimentacao"),
  termo("sub-mercado", "subcategoria", "Mercado", "cat-alimentacao"),
  termo("sub-odontologia", "subcategoria", "Odontologia", "cat-saude"),
  termo("sub-aplicativos", "subcategoria", "Aplicativos", "cat-transporte"),
  termo("sub-streaming", "subcategoria", "Streaming", "cat-lazer"),

  // objetivo — rótulos genéricos, sem nomes de pessoa
  termo("obj-pessoal", "objetivo", "Pessoal"),
  termo("obj-familia", "objetivo", "Família"),
  termo("obj-trabalho", "objetivo", "Trabalho"),
  termo("obj-casa", "objetivo", "Casa"),
  termo("obj-presente", "objetivo", "Presente"),

  // natureza
  termo("nat-fixa", "natureza", "Fixa"),
  termo("nat-variavel", "natureza", "Variável"),
  termo("nat-discricionaria", "natureza", "Discricionária"),
  termo("nat-extraordinaria", "natureza", "Extraordinária"),

  // essencialidade
  termo("ess-essencial", "essencialidade", "Essencial"),
  termo("ess-importante", "essencialidade", "Importante"),
  termo("ess-ajustavel", "essencialidade", "Ajustável"),
  termo("ess-dispensavel", "essencialidade", "Dispensável"),

  // tipo_de_ocorrência
  termo("occ-recorrente", "tipo_de_ocorrência", "Recorrente"),
  termo("occ-eventual", "tipo_de_ocorrência", "Eventual"),
  termo("occ-extraordinaria", "tipo_de_ocorrência", "Extraordinária"),
  termo("occ-parcelada", "tipo_de_ocorrência", "Parcelada"),
];

export function rotuloTermo(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return TAXONOMIA.find((t) => t.id === id)?.rotulo;
}

export function termosPorDimensao(dimensao: TermoTaxonomia["dimensao"]): TermoTaxonomia[] {
  return TAXONOMIA.filter((t) => t.dimensao === dimensao);
}
