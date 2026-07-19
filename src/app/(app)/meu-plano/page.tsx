import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarMetas } from "@/lib/metas/consulta";
import { carregarCompetencias } from "@/lib/competencias/consulta";
import { diasDecorridosNoMes } from "@/lib/data/competencia";
import { calcularProjecao } from "@/lib/metas/projecao";
import { MeuPlanoScreen } from "@/components/domain/metas/MeuPlanoScreen";

export default async function MeuPlanoPage() {
  const { supabase } = await perfilDoUsuarioAutenticado();

  const { data: taxonomia } = await supabase.from("taxonomia_termos").select("id, dimensao, rotulo, termo_pai_id").eq("status", "ativo");
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

  const [metas, competencias] = await Promise.all([carregarMetas(), carregarCompetencias()]);
  const atual = competencias[0];

  const metasAtivas = metas.filter((m) => m.status === "ativa");
  const planejadoTotal = metasAtivas.length > 0 ? metasAtivas.reduce((soma, m) => soma + m.valorLimiteEfetivo, 0) : null;

  const gastoAtualAbs = atual ? Math.abs(atual.totalConsolidado) : 0;
  const dias = atual ? diasDecorridosNoMes(atual.competencia.mesReferencia, new Date()) : null;
  const projecao = dias ? calcularProjecao(gastoAtualAbs, dias.decorridos, dias.total) : null;

  return (
    <MeuPlanoScreen
      metas={metas}
      mesReferencia={atual?.competencia.mesReferencia ?? ""}
      gastoAtualAbs={gastoAtualAbs}
      planejadoTotal={planejadoTotal}
      projecao={projecao}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
    />
  );
}
