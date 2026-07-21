import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarMetas } from "@/lib/metas/consulta";
import { carregarCompetencias, carregarUltimaAtualizacaoCompetencia } from "@/lib/competencias/consulta";
import { diasDecorridosNoMes, mesesAnteriores } from "@/lib/data/competencia";
import { calcularProjecao } from "@/lib/metas/projecao";
import { carregarPlanoMensal } from "@/lib/plano/consulta";
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

  const gastoAtualAbs = atual ? Math.abs(atual.totalConsolidado) : 0;
  const dias = atual ? diasDecorridosNoMes(atual.competencia.mesReferencia, new Date()) : null;
  const projecao = dias ? calcularProjecao(gastoAtualAbs, dias.decorridos, dias.total) : null;
  const ultimaAtualizacao = atual ? await carregarUltimaAtualizacaoCompetencia(atual.competencia.mesReferencia) : null;

  const mesReferencia = atual?.competencia.mesReferencia ?? "";
  const mesAnterior = mesReferencia ? mesesAnteriores(mesReferencia, 1)[0] : "";
  const plano = mesReferencia
    ? await carregarPlanoMensal(mesReferencia)
    : { id: null, mesReferencia: "", rendaInformada: null, linhas: [], total: 0, naoAlocado: null };
  // Só vale a pena checar o plano do mês anterior quando o mês atual ainda não tem plano — é a condição do nudge.
  const planoAnterior = plano.id === null && mesAnterior ? await carregarPlanoMensal(mesAnterior) : null;
  const planoAnteriorDisponivel = Boolean(planoAnterior && planoAnterior.linhas.length > 0);

  return (
    <MeuPlanoScreen
      metas={metas}
      mesReferencia={mesReferencia}
      mesAnterior={mesAnterior}
      estadoCompetencia={atual?.competencia.estado ?? null}
      ultimaAtualizacao={ultimaAtualizacao}
      gastoAtualAbs={gastoAtualAbs}
      projecao={projecao}
      plano={plano}
      planoAnteriorDisponivel={planoAnteriorDisponivel}
      categorias={categorias}
      subcategoriasPorCategoria={subcategoriasPorCategoria}
      objetivos={objetivos}
    />
  );
}
