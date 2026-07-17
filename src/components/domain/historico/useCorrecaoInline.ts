"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  corrigirClassificacao,
  corrigirTodosDoFornecedor,
  detectarDesvioDePadrao,
  type CorrecaoClassificacao,
  type PadraoDivergente,
} from "@/lib/classificacao/decisoes";
import { criarRegraManual } from "@/lib/regras/acoes";

export interface ItemCorrigivel {
  lancamentoId: string;
  categoriaId: string | null;
  subcategoriaId: string | null;
  objetivoId: string | null;
}

/**
 * Lógica de correção inline compartilhada entre a lista de `/historico` (HistoryRow)
 * e a planilha da competência (CompetencyLedgerTable): estado dos três selects
 * (categoria/subcategoria/objetivo), auto-save via `corrigirClassificacao`, reset
 * de subcategoria ao trocar categoria, e o prompt de desvio de padrão do Ajuste C
 * ("só este / todos os passados / nova regra").
 */
export function useCorrecaoInline(item: ItemCorrigivel) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [categoriaId, setCategoriaId] = useState(item.categoriaId ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState(item.subcategoriaId ?? "");
  const [objetivoId, setObjetivoId] = useState(item.objetivoId ?? "");
  const [desvio, setDesvio] = useState<PadraoDivergente | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function executar(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
        setDesvio(null);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  function correcaoAtual(overrides?: Partial<CorrecaoClassificacao>): CorrecaoClassificacao {
    return {
      categoriaId,
      subcategoriaId: subcategoriaId || undefined,
      objetivoId,
      ...overrides,
    };
  }

  async function aoTrocarCategoria(novaCategoriaId: string) {
    setCategoriaId(novaCategoriaId);
    setSubcategoriaId(""); // subcategoria antiga pode não pertencer à nova categoria
    if (!novaCategoriaId || !objetivoId) return;
    const padrao = await detectarDesvioDePadrao(item.lancamentoId, novaCategoriaId);
    if (padrao) {
      setDesvio(padrao);
    } else {
      executar(() =>
        corrigirClassificacao(item.lancamentoId, { categoriaId: novaCategoriaId, subcategoriaId: undefined, objetivoId }),
      );
    }
  }

  function aoTrocarSubcategoria(novaSubcategoriaId: string) {
    setSubcategoriaId(novaSubcategoriaId);
    if (!categoriaId || !objetivoId) return;
    executar(() =>
      corrigirClassificacao(item.lancamentoId, {
        categoriaId,
        subcategoriaId: novaSubcategoriaId || undefined,
        objetivoId,
      }),
    );
  }

  function aoTrocarObjetivo(novoObjetivoId: string) {
    setObjetivoId(novoObjetivoId);
    if (!categoriaId || !novoObjetivoId) return;
    executar(() =>
      corrigirClassificacao(item.lancamentoId, {
        categoriaId,
        subcategoriaId: subcategoriaId || undefined,
        objetivoId: novoObjetivoId,
      }),
    );
  }

  function resolverSoEste() {
    executar(() => corrigirClassificacao(item.lancamentoId, correcaoAtual()));
  }

  function resolverTodosPassados() {
    if (!desvio) return;
    executar(() => corrigirTodosDoFornecedor(desvio.fornecedorNormalizado, correcaoAtual()));
  }

  function resolverNovaRegra() {
    if (!desvio) return;
    // Cria a regra pra próximos lançamentos (mesmo comportamento do Ajuste C —
    // não corrige o lançamento atual aqui; a regra vale pra classificações futuras).
    executar(async () => {
      const formData = new FormData();
      formData.set("fornecedorTexto", desvio.fornecedorNormalizado);
      formData.set("categoriaId", categoriaId);
      formData.set("objetivoId", objetivoId);
      formData.set("confianca", "0.9");
      await criarRegraManual(formData);
    });
  }

  function cancelarDesvio() {
    setDesvio(null);
  }

  return {
    categoriaId,
    subcategoriaId,
    objetivoId,
    pendente,
    erro,
    desvio,
    aoTrocarCategoria,
    aoTrocarSubcategoria,
    aoTrocarObjetivo,
    resolverSoEste,
    resolverTodosPassados,
    resolverNovaRegra,
    cancelarDesvio,
  };
}
