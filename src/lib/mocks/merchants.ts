/**
 * Fornecedores padronizados sintéticos (ENT-STANDARD-MERCHANT). Nomes
 * fictícios — nenhum corresponde a fornecedor real ou aos exemplos dos docs
 * (Uber/Amazon/iFood).
 */
import type { FornecedorPadronizado } from "@/lib/domain/types";

export const FORNECEDORES: FornecedorPadronizado[] = [
  {
    id: "merch-corrida",
    nomeOficial: "Corrida Rápida App",
    categoriaDominanteId: "cat-transporte",
    confianca: 0.93,
    comportamentoContextual: false,
  },
  {
    id: "merch-mercado",
    nomeOficial: "Mercado Horizonte",
    confianca: 0.6,
    // comportamento contextual: não força categoria única (análogo ao caso Amazon do blueprint)
    comportamentoContextual: true,
  },
  {
    id: "merch-sabor",
    nomeOficial: "Sabor Express",
    categoriaDominanteId: "cat-alimentacao",
    confianca: 0.82,
    comportamentoContextual: false,
  },
  {
    id: "merch-clinica",
    nomeOficial: "Clínica Sorriso Claro",
    categoriaDominanteId: "cat-saude",
    confianca: 0.88,
    comportamentoContextual: false,
  },
  {
    id: "merch-streaming",
    nomeOficial: "Tela Norte Streaming",
    categoriaDominanteId: "cat-lazer",
    confianca: 0.95,
    comportamentoContextual: false,
  },
];

export function nomeFornecedor(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return FORNECEDORES.find((f) => f.id === id)?.nomeOficial;
}
