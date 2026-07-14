import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AliasResolvido {
  padraoTexto: string;
  fornecedorPadronizadoId: string;
  nomeOficial: string;
  categoriaDominanteRotulo: string | null;
}

/**
 * Sinais genéricos (não específicos da Família Gama) que ajudam o motor a
 * classificar sem precisar de IA, mesmo no primeiro uso — só categoria,
 * nunca objetivo (TAXONOMIA-INICIAL.md §5: fornecedor não define objetivo
 * sozinho). Lista propositalmente pequena e conservadora; cresce com o
 * tempo. Fornecedores com categoria genuinamente variável (Amazon, Mercado
 * Livre — "comportamento contextual") ficam de fora de propósito, para não
 * arriscar uma categoria errada — TAXONOMIA-INICIAL.md §2 "usar com cautela".
 */
const SUGESTOES_GENERICAS: { padrao: RegExp; categoria: string; subcategoria: string }[] = [
  { padrao: /\buber\b/i, categoria: "Transporte", subcategoria: "Aplicativos de transporte" },
  { padrao: /\b99\s*(app|pop|taxi)?\b/i, categoria: "Transporte", subcategoria: "Aplicativos de transporte" },
  { padrao: /\btag\s*ita[uú]|\bsem\s*parar\b|\bconectcar\b/i, categoria: "Transporte", subcategoria: "Pedágio" },
  { padrao: /\bifood\b/i, categoria: "Alimentação", subcategoria: "Delivery" },
  { padrao: /\bspotify\b/i, categoria: "Assinaturas e serviços digitais", subcategoria: "Streaming de música" },
  { padrao: /\bdeezer\b/i, categoria: "Assinaturas e serviços digitais", subcategoria: "Streaming de música" },
  { padrao: /\bnetflix\b/i, categoria: "Assinaturas e serviços digitais", subcategoria: "Streaming de vídeo" },
  { padrao: /\bdisney\+?\b/i, categoria: "Assinaturas e serviços digitais", subcategoria: "Streaming de vídeo" },
  { padrao: /\bhbo\s*max\b/i, categoria: "Assinaturas e serviços digitais", subcategoria: "Streaming de vídeo" },
  { padrao: /\bdroga(ria)?\b|\bfarmacia\b/i, categoria: "Saúde", subcategoria: "Medicamentos" },
  { padrao: /\bposto\s+ipiranga|\bposto\s+shell|\bposto\s+br\b/i, categoria: "Transporte", subcategoria: "Combustível" },
];

export function sugerirPorPadraoGenerico(descricaoOriginal: string) {
  for (const s of SUGESTOES_GENERICAS) {
    if (s.padrao.test(descricaoOriginal)) return s;
  }
  return null;
}

/** Carrega os aliases já cadastrados pra este perfil, indexados pra casar contra a descrição do lançamento. */
export async function carregarAliasesDoPerfil(supabase: SupabaseClient, perfilId: string): Promise<AliasResolvido[]> {
  const { data, error } = await supabase
    .from("fornecedor_aliases")
    .select(
      "padrao_texto, fornecedores_padronizados!inner(id, nome_oficial, perfil_id, taxonomia_termos(rotulo))",
    )
    .eq("fornecedores_padronizados.perfil_id", perfilId);
  if (error) throw new Error("Falha ao carregar fornecedores padronizados: " + error.message);

  return (data ?? []).map((row) => {
    const fornecedor = row.fornecedores_padronizados as unknown as {
      id: string;
      nome_oficial: string;
      taxonomia_termos: { rotulo: string } | null;
    };
    return {
      padraoTexto: (row.padrao_texto as string).toUpperCase(),
      fornecedorPadronizadoId: fornecedor.id,
      nomeOficial: fornecedor.nome_oficial,
      categoriaDominanteRotulo: fornecedor.taxonomia_termos?.rotulo ?? null,
    };
  });
}

/** Casa a descrição bruta contra os aliases cadastrados (mais específico primeiro). */
export function casarAlias(descricaoOriginal: string, aliases: AliasResolvido[]): AliasResolvido | null {
  const texto = descricaoOriginal.toUpperCase();
  const ordenados = [...aliases].sort((a, b) => b.padraoTexto.length - a.padraoTexto.length);
  for (const alias of ordenados) {
    if (texto.includes(alias.padraoTexto)) return alias;
  }
  return null;
}
