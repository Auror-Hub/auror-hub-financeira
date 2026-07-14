"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Pencil, MessageSquarePlus, ShieldAlert } from "lucide-react";
import type { ItemFila, StatusRevisaoLocal } from "@/lib/domain/inbox";
import { formatBRL, formatData } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SuggestionBlock } from "./SuggestionBlock";

export interface TransactionDrawerProps {
  item: ItemFila | null;
  status: StatusRevisaoLocal;
  rotulos: Record<string, string>;
  categorias: { id: string; rotulo: string }[];
  objetivos: { id: string; rotulo: string }[];
  onClose: () => void;
  onConfirmar: () => void;
  onCorrigir: (categoriaId: string, objetivoId: string) => void;
  onExcecao: (motivo: string) => void;
  onAdiar: () => void;
  onProximo?: () => void;
  onAnterior?: () => void;
}

type Modo = "detalhe" | "corrigir" | "excecao" | "contexto";

export function TransactionDrawer({
  item,
  status,
  rotulos,
  categorias,
  objetivos,
  onClose,
  onConfirmar,
  onCorrigir,
  onExcecao,
  onAdiar,
  onProximo,
  onAnterior,
}: TransactionDrawerProps) {
  const [modo, setModo] = useState<Modo>("detalhe");
  const [categoriaId, setCategoriaId] = useState("");
  const [objetivoId, setObjetivoId] = useState("");
  const [motivoExcecao, setMotivoExcecao] = useState("");
  const [contexto, setContexto] = useState("");

  if (!item) return null;
  const { lancamento, proposta } = item;
  const decidido = status !== "pendente";

  function resetModo() {
    setModo("detalhe");
    setCategoriaId("");
    setObjetivoId("");
    setMotivoExcecao("");
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
              className="rounded-btn-sm p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <button
              onClick={onProximo}
              disabled={!onProximo}
              title="Próximo item da fila"
              className="rounded-btn-sm p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>
          {!decidido && modo === "detalhe" && (
            <Button variant="success" size="sm" icon={<Check size={14} strokeWidth={2} />} onClick={onConfirmar}>
              Confirmar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {decidido && (
          <div className="rounded-card bg-state-success-tint p-3 text-sm text-green">
            Já revisado nesta sessão — status: <strong>{status}</strong>.
          </div>
        )}

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

        {!decidido && (
          <>
            {modo === "detalhe" && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                <Button variant="secondary" size="sm" icon={<Pencil size={14} strokeWidth={1.75} />} onClick={() => setModo("corrigir")}>
                  Alterar classificação
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<MessageSquarePlus size={14} strokeWidth={1.75} />}
                  onClick={() => setModo("contexto")}
                >
                  Adicionar contexto
                </Button>
                <Button variant="ghost" size="sm" icon={<ShieldAlert size={14} strokeWidth={1.75} />} onClick={() => setModo("excecao")}>
                  Marcar exceção
                </Button>
                <Button variant="ghost" size="sm" onClick={onAdiar}>
                  Revisar depois
                </Button>
              </div>
            )}

            {modo === "corrigir" && (
              <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
                <span className="eyebrow">Corrigir categoria e objetivo</span>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  Categoria
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
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
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onCorrigir(categoriaId || proposta.dimensoes.categoria || "", objetivoId || proposta.dimensoes.objetivo || "");
                      resetModo();
                    }}
                  >
                    Salvar correção
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetModo}>
                    Cancelar
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
                  <Button variant="primary" size="sm" onClick={resetModo}>
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
                    disabled={!motivoExcecao.trim()}
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
          </>
        )}
      </div>
    </Drawer>
  );
}
