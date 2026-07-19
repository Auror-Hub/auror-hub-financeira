import "server-only";
import { perfilDoUsuarioAutenticado } from "@/lib/auth/perfil";
import { carregarIdsInativos } from "@/lib/lancamentos/inativos";
import { rankearCandidatos, type CandidatoLancamento } from "./matcher";

const JANELA_DIAS = 10;

export interface CandidatoConciliacao {
  id: string;
  data: string;
  valor: number;
  fornecedorOriginal: string;
  score: number;
}

export interface ProvisorioPendente {
  id: string;
  dataOcorrencia: string;
  valor: number;
  descricaoUsuario: string;
  fornecedorDica: string | null;
  categoriaDicaRotulo: string | null;
  objetivoDicaRotulo: string | null;
  contexto: string | null;
  criadoEm: string;
  candidatos: CandidatoConciliacao[];
}

function deslocarDias(dataIso: string, dias: number): string {
  const d = new Date(dataIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Provisórios aguardando conciliação, cada um com os candidatos (lançamentos
 * reais dentro de ±10 dias da data informada) já ranqueados pelo matcher.
 * Uma query de candidatos por provisório — aceitável pro volume esperado
 * (poucas capturas pendentes por vez); revisitar se isso crescer muito.
 */
export async function carregarProvisoriosPendentes(): Promise<ProvisorioPendente[]> {
  const { supabase, perfilId } = await perfilDoUsuarioAutenticado();

  const { data: provisoriosRaw, error } = await supabase
    .from("lancamentos_provisorios")
    .select("id, data_ocorrencia, valor, descricao_usuario, fornecedor_dica, categoria_dica, objetivo_dica, contexto, criado_em")
    .eq("perfil_id", perfilId)
    .eq("status", "aguardando_conciliacao")
    .order("criado_em", { ascending: false });
  if (error) throw new Error("Falha ao carregar provisórios: " + error.message);
  const provisorios = provisoriosRaw ?? [];
  if (provisorios.length === 0) return [];

  const idsTermos = new Set<string>();
  for (const p of provisorios) {
    if (p.categoria_dica) idsTermos.add(p.categoria_dica as string);
    if (p.objetivo_dica) idsTermos.add(p.objetivo_dica as string);
  }
  const { data: termosRaw } = await supabase
    .from("taxonomia_termos")
    .select("id, rotulo")
    .in("id", idsTermos.size > 0 ? [...idsTermos] : ["00000000-0000-0000-0000-000000000000"]);
  const rotuloPorTermo = new Map((termosRaw ?? []).map((t) => [t.id as string, t.rotulo as string]));

  const { data: cartoesDoPerfil } = await supabase.from("cartoes").select("id").eq("perfil_id", perfilId);
  const cartaoIds = (cartoesDoPerfil ?? []).map((c) => c.id as string);

  // Lançamentos já conciliados com outro provisório — nunca oferecidos de novo.
  const { data: jaConciliadosRaw } = await supabase
    .from("lancamentos_provisorios")
    .select("lancamento_conciliado_id")
    .eq("perfil_id", perfilId)
    .eq("status", "conciliado");
  const jaConciliados = new Set((jaConciliadosRaw ?? []).map((r) => r.lancamento_conciliado_id as string));

  const inativos = cartaoIds.length > 0 ? await carregarIdsInativos(supabase, perfilId) : new Set<string>();

  const resultado: ProvisorioPendente[] = [];
  for (const p of provisorios) {
    const dataOcorrencia = p.data_ocorrencia as string;

    let candidatos: CandidatoLancamento[] = [];
    if (cartaoIds.length > 0) {
      const { data: lancamentosRaw } = await supabase
        .from("lancamentos_brutos")
        .select("id, data, valor, fornecedor_original")
        .in("cartao_id", cartaoIds)
        .gte("data", deslocarDias(dataOcorrencia, -JANELA_DIAS))
        .lte("data", deslocarDias(dataOcorrencia, JANELA_DIAS));
      candidatos = (lancamentosRaw ?? [])
        .filter((l) => !inativos.has(l.id as string) && !jaConciliados.has(l.id as string))
        .map((l) => ({
          id: l.id as string,
          data: l.data as string,
          valor: l.valor as number,
          fornecedorOriginal: l.fornecedor_original as string,
        }));
    }

    const provisorioParaMatch = { dataOcorrencia, valor: p.valor as number, fornecedorDica: (p.fornecedor_dica as string | null) ?? null };
    const ranked = rankearCandidatos(provisorioParaMatch, candidatos);
    const candidatosPorId = new Map(candidatos.map((c) => [c.id, c]));

    resultado.push({
      id: p.id as string,
      dataOcorrencia,
      valor: p.valor as number,
      descricaoUsuario: p.descricao_usuario as string,
      fornecedorDica: (p.fornecedor_dica as string | null) ?? null,
      categoriaDicaRotulo: p.categoria_dica ? rotuloPorTermo.get(p.categoria_dica as string) ?? null : null,
      objetivoDicaRotulo: p.objetivo_dica ? rotuloPorTermo.get(p.objetivo_dica as string) ?? null : null,
      contexto: (p.contexto as string | null) ?? null,
      criadoEm: p.criado_em as string,
      candidatos: ranked.map((r) => {
        const c = candidatosPorId.get(r.id)!;
        return { id: c.id, data: c.data, valor: c.valor, fornecedorOriginal: c.fornecedorOriginal, score: r.score };
      }),
    });
  }

  return resultado;
}
