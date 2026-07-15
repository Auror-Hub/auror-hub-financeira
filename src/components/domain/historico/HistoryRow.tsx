"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemHistorico } from "@/lib/historico/consulta";
import { corrigirClassificacao, corrigirTodosDoFornecedor, detectarDesvioDePadrao, type PadraoDivergente } from "@/lib/classificacao/decisoes";
import { criarRegraManual } from "@/lib/regras/acoes";
import { formatBRL, formatData } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export interface HistoryRowProps {
  item: ItemHistorico;
  categorias: { id: string; rotulo: string }[];
  objetivos: { id: string; rotulo: string }[];
}

export function HistoryRow({ item, categorias, objetivos }: HistoryRowProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [categoriaId, setCategoriaId] = useState(item.categoriaId ?? "");
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

  async function aoTrocarCategoria(novaCategoriaId: string) {
    setCategoriaId(novaCategoriaId);
    if (!novaCategoriaId || !objetivoId) return;
    const padrao = await detectarDesvioDePadrao(item.lancamentoId, novaCategoriaId);
    if (padrao) {
      setDesvio(padrao);
    } else {
      executar(() => corrigirClassificacao(item.lancamentoId, { categoriaId: novaCategoriaId, objetivoId }));
    }
  }

  function aoTrocarObjetivo(novoObjetivoId: string) {
    setObjetivoId(novoObjetivoId);
    if (!categoriaId || !novoObjetivoId) return;
    executar(() => corrigirClassificacao(item.lancamentoId, { categoriaId, objetivoId: novoObjetivoId }));
  }

  return (
    <li className="flex flex-col gap-1.5 border-b border-border-subtle py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-base text-text-primary">{item.fornecedorOriginal}</span>
          <span className="font-mono-nums text-sm text-text-muted">{formatData(item.data)}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoriaId}
            disabled={pendente}
            onChange={(e) => aoTrocarCategoria(e.target.value)}
            className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary"
          >
            <option value="">Categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <select
            value={objetivoId}
            disabled={pendente}
            onChange={(e) => aoTrocarObjetivo(e.target.value)}
            className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary"
          >
            <option value="">Objetivo</option>
            {objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <span className="w-24 shrink-0 text-right font-mono-nums text-base text-text-primary">{formatBRL(item.valor)}</span>
        </div>
      </div>

      {erro && <p className="text-sm text-terra">{erro}</p>}

      {desvio && (
        <div className="flex flex-col gap-2 rounded-card bg-indigo-tint p-2.5 text-sm">
          <span className="text-text-secondary">
            Esse fornecedor costuma ser <strong>{desvio.categoriaAtualRotulo}</strong>. O que você quer fazer?
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={pendente}
              onClick={() => executar(() => corrigirClassificacao(item.lancamentoId, { categoriaId, objetivoId }))}
            >
              Só este
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pendente}
              onClick={() => executar(() => corrigirTodosDoFornecedor(desvio.fornecedorNormalizado, { categoriaId, objetivoId }))}
            >
              Todos os passados
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={pendente}
              onClick={() =>
                executar(async () => {
                  const formData = new FormData();
                  formData.set("fornecedorTexto", desvio.fornecedorNormalizado);
                  formData.set("categoriaId", categoriaId);
                  formData.set("objetivoId", objetivoId);
                  formData.set("confianca", "0.9");
                  await criarRegraManual(formData);
                })
              }
            >
              Nova regra
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDesvio(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
