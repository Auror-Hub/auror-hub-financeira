import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarLancamentosDecididos } from "@/lib/historico/consulta";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { HistoryListScreen } from "@/components/domain/historico/HistoryListScreen";

interface SearchParams {
  categoriaId?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  competenciaMes?: string;
  objetivoId?: string;
  cartaoId?: string;
  statusDecisao?: string;
  valorMin?: string;
  valorMax?: string;
  pagina?: string;
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase
    .from("taxonomia_termos")
    .select("id, dimensao, rotulo, termo_pai_id")
    .eq("status", "ativo");
  const { data: cartoesRaw } = await supabase
    .from("cartoes")
    .select("id, instituicao, apelido, tipo")
    .eq("perfil_id", perfilId);
  const cartoes = (cartoesRaw ?? []).map((c) => ({
    id: c.id as string,
    rotulo: (c.apelido as string | null) || (c.instituicao as string),
    tipo: c.tipo as "cartao" | "conta",
  }));
  const categorias = (taxonomia ?? [])
    .filter((t) => t.dimensao === "categoria")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));
  const objetivos = (taxonomia ?? [])
    .filter((t) => t.dimensao === "objetivo")
    .map((t) => ({ id: t.id as string, rotulo: t.rotulo as string }));

  const subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]> = {};
  for (const t of taxonomia ?? []) {
    if (t.dimensao !== "subcategoria" || !t.termo_pai_id) continue;
    const paiId = t.termo_pai_id as string;
    (subcategoriasPorCategoria[paiId] ??= []).push({ id: t.id as string, rotulo: t.rotulo as string });
  }

  const competencias = await carregarCompetencias();

  const filtros = {
    categoriaId: params.categoriaId,
    fornecedor: params.fornecedor,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    competenciaMes: params.competenciaMes,
    objetivoId: params.objetivoId,
    cartaoId: params.cartaoId,
    statusDecisao: params.statusDecisao as "confirmada" | "corrigida" | "exceção" | undefined,
    valorMin: params.valorMin ? Math.round(Number(params.valorMin) * 100) : undefined,
    valorMax: params.valorMax ? Math.round(Number(params.valorMax) * 100) : undefined,
  };
  const pagina = Number(params.pagina ?? "1") || 1;

  const resultado = await carregarLancamentosDecididos(filtros, pagina);

  return (
    <HistoryListScreen
      resultado={resultado}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
      cartoes={cartoes}
      competencias={competencias.map((c) => c.competencia.mesReferencia)}
      filtrosAtuais={{ ...filtros, valorMin: params.valorMin, valorMax: params.valorMax }}
    />
  );
}
