"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Layers, PartyPopper, Sparkles } from "lucide-react";
import type { ItemFila, TipoPendencia } from "@/lib/domain/inbox";
import { classificarLancamentosPendentes } from "@/lib/classificacao/actions";
import {
  adicionarContexto,
  confirmarClassificacao,
  corrigirClassificacao,
  corrigirLote,
  corrigirTodosDoFornecedor,
  marcarExcecao,
  type CorrecaoClassificacao,
} from "@/lib/classificacao/decisoes";
import { criarRegraManual } from "@/lib/regras/acoes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReviewCard } from "./ReviewCard";
import { TransactionDrawer } from "./TransactionDrawer";
import { BatchReviewPanel } from "./BatchReviewPanel";

type Ordenacao = "confianca" | "valor" | "data" | "fornecedor";

const ORDENACOES: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "confianca", rotulo: "Confiança (menor primeiro)" },
  { valor: "valor", rotulo: "Valor (maior primeiro)" },
  { valor: "data", rotulo: "Data" },
  { valor: "fornecedor", rotulo: "Fornecedor" },
];

export interface InboxScreenProps {
  itens: ItemFila[];
  rotulos: Record<string, string>;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
  lancamentosSemProposta: number;
}

export function InboxScreen({ itens, rotulos, categorias, subcategoriasPorCategoria, objetivos, lancamentosSemProposta }: InboxScreenProps) {
  const router = useRouter();
  const [pendenteClassificacao, startTransition] = useTransition();
  const [pendenteAcao, startAcaoTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

  /** "Revisar depois" não persiste (não há ENT-REVIEW-EVENT pra isso) — só some da fila até recarregar. */
  const [adiados, setAdiados] = useState<Set<string>>(new Set());
  const [filtroPendencia, setFiltroPendencia] = useState<TipoPendencia | "todas">("todas");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("confianca");
  const [itemAbertoId, setItemAbertoId] = useState<string | null>(null);
  const [grupoLoteAberto, setGrupoLoteAberto] = useState<string | null>(null);

  const pendentes = useMemo(() => itens.filter((i) => !adiados.has(i.lancamento.id)), [itens, adiados]);

  const tiposPresentes = useMemo(() => {
    const set = new Set<TipoPendencia>();
    pendentes.forEach((i) => i.tiposPendencia.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [pendentes]);

  const filtrados = useMemo(() => {
    const base =
      filtroPendencia === "todas" ? pendentes : pendentes.filter((i) => i.tiposPendencia.includes(filtroPendencia));
    return [...base].sort((a, b) => {
      switch (ordenacao) {
        case "confianca":
          return a.proposta.confiancaGeral - b.proposta.confiancaGeral;
        case "valor":
          return b.lancamento.valor - a.lancamento.valor;
        case "data":
          return a.lancamento.data.localeCompare(b.lancamento.data);
        case "fornecedor":
          return a.fornecedorNomeOriginal.localeCompare(b.fornecedorNomeOriginal);
      }
    });
  }, [pendentes, filtroPendencia, ordenacao]);

  const gruposLote = useMemo(() => {
    const map = new Map<string, ItemFila[]>();
    pendentes.forEach((i) => {
      if (!i.grupoLoteId) return;
      const lista = map.get(i.grupoLoteId) ?? [];
      lista.push(i);
      map.set(i.grupoLoteId, lista);
    });
    return Array.from(map.entries()).filter(([, itens]) => itens.length >= 2);
  }, [pendentes]);

  const totalAdiados = adiados.size;
  const itemAberto = filtrados.find((i) => i.lancamento.id === itemAbertoId) ?? null;
  const indexAberto = itemAberto ? filtrados.indexOf(itemAberto) : -1;

  function executarAcao(acao: () => Promise<void>, aoTerminar?: () => void) {
    setErro(null);
    startAcaoTransition(async () => {
      try {
        await acao();
        aoTerminar?.();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gravar a decisão.");
      }
    });
  }

  function adiar(id: string) {
    setAdiados((prev) => new Set(prev).add(id));
    if (itemAbertoId === id) setItemAbertoId(null);
  }

  function confirmar(id: string) {
    executarAcao(() => confirmarClassificacao(id), () => setItemAbertoId((atual) => (atual === id ? null : atual)));
  }

  function corrigir(id: string, correcao: CorrecaoClassificacao) {
    executarAcao(() => corrigirClassificacao(id, correcao), () => setItemAbertoId(null));
  }

  function corrigirTodos(fornecedorNormalizado: string, correcao: CorrecaoClassificacao) {
    executarAcao(() => corrigirTodosDoFornecedor(fornecedorNormalizado, correcao), () => setItemAbertoId(null));
  }

  function criarRegraDireta(fornecedorNormalizado: string, categoriaId: string, objetivoId: string) {
    executarAcao(() => {
      const formData = new FormData();
      formData.set("fornecedorTexto", fornecedorNormalizado);
      formData.set("categoriaId", categoriaId);
      formData.set("objetivoId", objetivoId);
      formData.set("confianca", "0.9");
      return criarRegraManual(formData);
    }, () => setItemAbertoId(null));
  }

  function excecao(id: string, motivo: string) {
    executarAcao(() => marcarExcecao(id, motivo), () => setItemAbertoId(null));
  }

  function contexto(id: string, texto: string) {
    executarAcao(() => adicionarContexto(id, texto));
  }

  function confirmarGrupo(ids: string[]) {
    executarAcao(async () => {
      for (const id of ids) await confirmarClassificacao(id);
    }, () => setGrupoLoteAberto(null));
  }

  function editarGrupo(ids: string[], correcao: CorrecaoClassificacao) {
    executarAcao(() => corrigirLote(ids, correcao), () => setGrupoLoteAberto(null));
  }

  function gerarPropostas() {
    setErro(null);
    setProgresso({ feitos: 0, total: lancamentosSemProposta });
    startTransition(async () => {
      try {
        let restantes = 1;
        let feitos = 0;
        // Cada chamada processa só um lote via IA (ver classificarLancamentos) — repete
        // até não sobrar nada, em vez de uma única chamada gigante que estouraria o
        // timeout da função serverless com uma importação grande.
        while (restantes > 0) {
          const resultado = await classificarLancamentosPendentes();
          feitos += resultado.totalProcessados;
          restantes = resultado.restantes;
          setProgresso({ feitos, total: lancamentosSemProposta });
          if (resultado.totalProcessados === 0 && restantes === 0) break;
        }
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gerar propostas de classificação.");
      } finally {
        setProgresso(null);
      }
    });
  }

  const bannerPendentesClassificacao = lancamentosSemProposta > 0 && (
    <div className="flex items-center justify-between gap-3 rounded-card border border-dashed border-indigo/40 bg-indigo-tint p-3">
      <span className="flex items-center gap-2 text-base text-action-primary">
        <Sparkles size={16} strokeWidth={1.75} />
        {lancamentosSemProposta} lançamento{lancamentosSemProposta === 1 ? "" : "s"} aguardando classificação.
      </span>
      <Button variant="primary" size="sm" disabled={pendenteClassificacao} onClick={gerarPropostas}>
        {pendenteClassificacao ? (progresso ? `Classificando... ${progresso.feitos}/${progresso.total}` : "Classificando...") : "Gerar propostas"}
      </Button>
    </div>
  );

  if (pendentes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {bannerPendentesClassificacao}
        {erro && <p className="text-sm text-terra">{erro}</p>}
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-primary p-10 text-center shadow-[var(--shadow-card)]">
          <PartyPopper size={28} className="text-state-success" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-text-primary">Nenhuma pendência no momento</h1>
          <p className="max-w-md text-base text-text-secondary">
            {itens.length === 0
              ? "Nenhum lançamento aguardando revisão — envie uma fatura ou aguarde a classificação para começar."
              : `Você adiou ${totalAdiados} lançamento${totalAdiados === 1 ? "" : "s"} nesta sessão — eles voltam a aparecer ao recarregar a página.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {bannerPendentesClassificacao}
      {erro && <p className="text-sm text-terra">{erro}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-text-muted" strokeWidth={1.75} />
          <h1 className="text-xl font-semibold text-text-primary">Caixa de Entrada</h1>
          <span className="font-mono-nums text-sm text-text-muted">
            {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
          </span>
        </div>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          className="h-8 rounded-input border border-border-default bg-surface-primary px-2 text-sm text-text-primary"
        >
          {ORDENACOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por tipo de pendência */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFiltroPendencia("todas")}>
          <Badge tone={filtroPendencia === "todas" ? "indigo" : "slate"}>Todas</Badge>
        </button>
        {tiposPresentes.map((t) => (
          <button key={t} onClick={() => setFiltroPendencia(t)}>
            <Badge tone={filtroPendencia === t ? "indigo" : "slate"}>{t}</Badge>
          </button>
        ))}
      </div>

      {/* Grupos elegíveis para revisão em lote */}
      {gruposLote.map(([grupoId, itensDoGrupo]) => (
        <button
          key={grupoId}
          onClick={() => setGrupoLoteAberto(grupoId)}
          className="flex items-center justify-between rounded-card border border-dashed border-indigo/40 bg-indigo-tint p-3 text-left transition-colors hover:bg-indigo-tint/70"
        >
          <span className="flex items-center gap-2 text-base text-action-primary">
            <Layers size={16} strokeWidth={1.75} />
            {itensDoGrupo.length} lançamentos semelhantes de {itensDoGrupo[0].fornecedorNomeOriginal} — revisar em lote
          </span>
          <span className="text-sm font-medium text-action-primary">Abrir</span>
        </button>
      ))}

      <div className="flex flex-col gap-3">
        {filtrados.map((item) => (
          <ReviewCard
            key={item.lancamento.id}
            item={item}
            rotulos={rotulos}
            onAbrir={() => setItemAbertoId(item.lancamento.id)}
            onConfirmar={() => confirmar(item.lancamento.id)}
          />
        ))}
        {filtrados.length === 0 && (
          <p className="rounded-card bg-surface-primary p-6 text-center text-base text-text-muted shadow-[var(--shadow-card)]">
            Nenhum lançamento para este filtro.
          </p>
        )}
      </div>

      <TransactionDrawer
        item={itemAberto}
        pendente={pendenteAcao}
        rotulos={rotulos}
        categorias={categorias}
        subcategoriasPorCategoria={subcategoriasPorCategoria}
        objetivos={objetivos}
        onClose={() => setItemAbertoId(null)}
        onConfirmar={() => itemAberto && confirmar(itemAberto.lancamento.id)}
        onCorrigir={(correcao) => itemAberto && corrigir(itemAberto.lancamento.id, correcao)}
        onCorrigirTodosDoFornecedor={(fornecedorNormalizado, correcao) => corrigirTodos(fornecedorNormalizado, correcao)}
        onCriarRegraDireta={(fornecedorNormalizado, categoriaId, objetivoId) => criarRegraDireta(fornecedorNormalizado, categoriaId, objetivoId)}
        onExcecao={(motivo) => itemAberto && excecao(itemAberto.lancamento.id, motivo)}
        onAdicionarContexto={(texto) => itemAberto && contexto(itemAberto.lancamento.id, texto)}
        onAdiar={() => itemAberto && adiar(itemAberto.lancamento.id)}
        onProximo={
          indexAberto >= 0 && indexAberto < filtrados.length - 1
            ? () => setItemAbertoId(filtrados[indexAberto + 1].lancamento.id)
            : undefined
        }
        onAnterior={
          indexAberto > 0 ? () => setItemAbertoId(filtrados[indexAberto - 1].lancamento.id) : undefined
        }
      />

      <BatchReviewPanel
        itens={grupoLoteAberto ? (gruposLote.find(([id]) => id === grupoLoteAberto)?.[1] ?? []) : []}
        open={!!grupoLoteAberto}
        rotulos={rotulos}
        categorias={categorias}
        subcategoriasPorCategoria={subcategoriasPorCategoria}
        objetivos={objetivos}
        onClose={() => setGrupoLoteAberto(null)}
        onAplicar={confirmarGrupo}
        onEditarEAplicar={editarGrupo}
      />
    </div>
  );
}
