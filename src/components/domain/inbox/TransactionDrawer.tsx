"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Pencil, MessageSquarePlus, ShieldAlert } from "lucide-react";
import type { ItemFila } from "@/lib/domain/inbox";
import type { CorrecaoClassificacao, PadraoDivergente } from "@/lib/classificacao/decisoes";
import { detectarDesvioDePadrao } from "@/lib/classificacao/decisoes";
import { formatBRL, formatData } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SuggestionBlock } from "./SuggestionBlock";

export interface TransactionDrawerProps {
  item: ItemFila | null;
  /** Desabilita as ações enquanto uma decisão está sendo gravada. */
  pendente: boolean;
  rotulos: Record<string, string>;
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
  onClose: () => void;
  onConfirmar: () => void;
  onCorrigir: (correcao: CorrecaoClassificacao) => void;
  onCorrigirTodosDoFornecedor: (fornecedorNormalizado: string, correcao: CorrecaoClassificacao) => void;
  onCriarRegraDireta: (fornecedorNormalizado: string, categoriaId: string, objetivoId: string) => void;
  onExcecao: (motivo: string) => void;
  onAdicionarContexto: (contexto: string) => void;
  onAdiar: () => void;
  onProximo?: () => void;
  onAnterior?: () => void;
}

type Modo = "detalhe" | "corrigir" | "excecao" | "contexto";

export function TransactionDrawer({
  item,
  pendente,
  rotulos,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
  onClose,
  onConfirmar,
  onCorrigir,
  onCorrigirTodosDoFornecedor,
  onCriarRegraDireta,
  onExcecao,
  onAdicionarContexto,
  onAdiar,
  onProximo,
  onAnterior,
}: TransactionDrawerProps) {
  const [modo, setModo] = useState<Modo>("detalhe");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [objetivoId, setObjetivoId] = useState("");
  const [motivoExcecao, setMotivoExcecao] = useState("");
  const [contexto, setContexto] = useState("");
  const [desvio, setDesvio] = useState<PadraoDivergente | null>(null);
  const [correcaoPendente, setCorrecaoPendente] = useState<CorrecaoClassificacao | null>(null);
  const [verificandoDesvio, setVerificandoDesvio] = useState(false);

  if (!item) return null;
  const { lancamento, proposta } = item;

  function resetModo() {
    setModo("detalhe");
    setCategoriaId("");
    setSubcategoriaId("");
    setObjetivoId("");
    setMotivoExcecao("");
    setContexto("");
    setDesvio(null);
    setCorrecaoPendente(null);
  }

  function alterarCategoria(novaCategoriaId: string) {
    setCategoriaId(novaCategoriaId);
    setSubcategoriaId("");
  }

  const categoriaEfetivaId = categoriaId || proposta.dimensoes.categoria || "";
  const subcategoriasDisponiveis = subcategoriasPorCategoria[categoriaEfetivaId] ?? [];

  async function tentarSalvarCorrecao() {
    const correcaoFinal: CorrecaoClassificacao = {
      categoriaId: categoriaEfetivaId,
      subcategoriaId: subcategoriaId || undefined,
      objetivoId: objetivoId || proposta.dimensoes.objetivo || "",
      contexto: proposta.contextoSugerido,
    };

    setVerificandoDesvio(true);
    try {
      const padrao = await detectarDesvioDePadrao(lancamento.id, correcaoFinal.categoriaId);
      if (padrao) {
        setDesvio(padrao);
        setCorrecaoPendente(correcaoFinal);
      } else {
        onCorrigir(correcaoFinal);
        resetModo();
      }
    } finally {
      setVerificandoDesvio(false);
    }
  }

  return (
    <Drawer
      open={!!item}
      onClose={() => {
        resetModo();
        onClose();
      }}
      title={formatBRL(lancamento.valor)}
      subtitle="Detalhe do lançamento"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={onAnterior}
              disabled={!onAnterior}
              title="Item anterior da fila"
              className="rounded-btn-sm p-2 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <button
              onClick={onProximo}
              disabled={!onProximo}
              title="Próximo item da fila"
              className="rounded-btn-sm p-2 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>
          {modo === "detalhe" && (
            <Button variant="success" size="sm" icon={<Check size={14} strokeWidth={2} />} disabled={pendente} onClick={onConfirmar}>
              Confirmar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Fato — dado bruto imutável */}
        <section className="flex flex-col gap-2">
          <span className="eyebrow">Fato (lançamento bruto — imutável)</span>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
            <dt className="text-text-muted">Data</dt>
            <dd className="font-mono-nums text-text-primary">{formatData(lancamento.data)}</dd>
            <dt className="text-text-muted">Fornecedor original</dt>
            <dd className="text-text-primary">{item.fornecedorNomeOriginal}</dd>
            <dt className="text-text-muted">Descrição original</dt>
            <dd className="text-text-primary">{lancamento.descricaoOriginal}</dd>
            <dt className="text-text-muted">Valor</dt>
            <dd className="font-mono-nums text-text-primary">{formatBRL(lancamento.valor)}</dd>
          </dl>
        </section>

        {/* Sugestão da IA */}
        <section className="flex flex-col gap-2">
          <span className="eyebrow">Proposta</span>
          <SuggestionBlock proposta={proposta} rotulos={rotulos} />
        </section>

        {/* Pendências */}
        {item.tiposPendencia.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tiposPendencia.map((t) => (
              <Badge key={t} tone="gold">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {modo === "detalhe" && (
          <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil size={14} strokeWidth={1.75} />}
              disabled={pendente}
              onClick={() => setModo("corrigir")}
            >
              Alterar classificação
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquarePlus size={14} strokeWidth={1.75} />}
              disabled={pendente}
              onClick={() => setModo("contexto")}
            >
              Adicionar contexto
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ShieldAlert size={14} strokeWidth={1.75} />}
              disabled={pendente}
              onClick={() => setModo("excecao")}
            >
              Marcar exceção
            </Button>
            <Button variant="ghost" size="sm" disabled={pendente} onClick={onAdiar}>
              Revisar depois
            </Button>
          </div>
        )}

        {modo === "corrigir" && !desvio && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
            <span className="eyebrow">Corrigir categoria, subcategoria e objetivo</span>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Categoria
              <select
                value={categoriaId}
                onChange={(e) => alterarCategoria(e.target.value)}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                <option value="">
                  {(proposta.dimensoes.categoria && rotulos[proposta.dimensoes.categoria]) ?? "Selecionar"} (sugerido)
                </option>
                {categorias.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Subcategoria
              <select
                value={subcategoriaId}
                onChange={(e) => setSubcategoriaId(e.target.value)}
                disabled={subcategoriasDisponiveis.length === 0}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
              >
                <option value="">
                  {subcategoriasDisponiveis.length === 0
                    ? "Nenhuma subcategoria pra esta categoria"
                    : (proposta.dimensoes.subcategoria && rotulos[proposta.dimensoes.subcategoria]) ?? "Nenhuma"}
                </option>
                {subcategoriasDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Objetivo
              <select
                value={objetivoId}
                onChange={(e) => setObjetivoId(e.target.value)}
                className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
              >
                <option value="">{(proposta.dimensoes.objetivo && rotulos[proposta.dimensoes.objetivo]) ?? "Selecionar"} (sugerido)</option>
                {objetivos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={pendente || verificandoDesvio} onClick={tentarSalvarCorrecao}>
                {verificandoDesvio ? "Verificando..." : "Salvar correção"}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetModo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {modo === "corrigir" && desvio && correcaoPendente && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
            <span className="eyebrow">Esse fornecedor costuma ser {desvio.categoriaAtualRotulo}</span>
            <p className="text-sm text-text-secondary">
              Você está classificando &ldquo;{item.fornecedorNomeOriginal}&rdquo; de um jeito diferente do padrão anterior. O que você quer fazer?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pendente}
                onClick={() => {
                  onCorrigir(correcaoPendente);
                  resetModo();
                }}
              >
                Só este lançamento
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pendente}
                onClick={() => {
                  onCorrigirTodosDoFornecedor(desvio.fornecedorNormalizado, correcaoPendente);
                  resetModo();
                }}
              >
                Todos os lançamentos passados desse fornecedor
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={pendente}
                onClick={() => {
                  onCriarRegraDireta(desvio.fornecedorNormalizado, correcaoPendente.categoriaId, correcaoPendente.objetivoId);
                  resetModo();
                }}
              >
                Nova regra para os próximos lançamentos
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDesvio(null)}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {modo === "contexto" && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
            <span className="eyebrow">Adicionar contexto</span>
            <textarea
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex.: refeição de trabalho com cliente"
              rows={3}
              className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={pendente || !contexto.trim()}
                onClick={() => {
                  onAdicionarContexto(contexto);
                  resetModo();
                }}
              >
                Salvar contexto
              </Button>
              <Button variant="ghost" size="sm" onClick={resetModo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {modo === "excecao" && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
            <span className="eyebrow">Marcar como exceção</span>
            <p className="text-sm text-text-muted">
              A exceção não altera a regra ou padrão geral do fornecedor — apenas registra que este caso é diferente.
            </p>
            <textarea
              value={motivoExcecao}
              onChange={(e) => setMotivoExcecao(e.target.value)}
              placeholder="Motivo da exceção"
              rows={3}
              className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={pendente || !motivoExcecao.trim()}
                onClick={() => {
                  onExcecao(motivoExcecao);
                  resetModo();
                }}
              >
                Confirmar exceção
              </Button>
              <Button variant="ghost" size="sm" onClick={resetModo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
