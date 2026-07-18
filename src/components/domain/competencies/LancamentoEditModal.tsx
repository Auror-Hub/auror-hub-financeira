"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { ItemHistorico } from "@/lib/historico/consulta";
import { editarLancamento, excluirLancamento } from "@/lib/lancamentos/edicao";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface CartaoOpcaoEdicao {
  id: string;
  instituicao: string;
  apelido: string | null;
  tipo: string;
  ultimos4: string | null;
}

export interface LancamentoEditModalProps {
  open: boolean;
  onClose: () => void;
  item: ItemHistorico;
  cartoes: CartaoOpcaoEdicao[];
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

const selectClass = "h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary";

function rotuloCartao(c: CartaoOpcaoEdicao): string {
  const base = c.apelido || c.instituicao;
  const tipo = c.tipo === "conta" ? "conta" : "cartão";
  return c.ultimos4 ? `${base} ••${c.ultimos4} (${tipo})` : `${base} (${tipo})`;
}

/**
 * ADR-005: edição completa de um lançamento (todos os campos do cadastro,
 * inclusive competência) e exclusão. Campos brutos editados geram uma nova
 * versão do lançamento; a original é preservada. Exclusão apenas esconde.
 */
export function LancamentoEditModal({
  open,
  onClose,
  item,
  cartoes,
  categorias,
  subcategoriasPorCategoria,
  objetivos,
}: LancamentoEditModalProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const [cartaoId, setCartaoId] = useState(item.cartaoId);
  const [data, setData] = useState(item.data);
  const [competencia, setCompetencia] = useState(item.competenciaCalculada);
  const [fornecedor, setFornecedor] = useState(item.fornecedorOriginal);
  const [descricao, setDescricao] = useState(item.descricaoOriginal);
  const [valor, setValor] = useState(String(Math.abs(item.valor) / 100));
  const [categoriaId, setCategoriaId] = useState(item.categoriaId ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState(item.subcategoriaId ?? "");
  const [objetivoId, setObjetivoId] = useState(item.objetivoId ?? "");
  const [contexto, setContexto] = useState(item.contexto ?? "");

  const subcategorias = categoriaId ? subcategoriasPorCategoria[categoriaId] ?? [] : [];

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        await editarLancamento(item.lancamentoId, {
          cartaoId,
          data,
          competencia,
          fornecedor,
          descricao,
          valorReais: Number(valor),
          categoriaId,
          subcategoriaId: subcategoriaId || undefined,
          objetivoId,
          contexto: contexto.trim() || undefined,
        });
        onClose();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar o lançamento.");
      }
    });
  }

  function excluir() {
    setErro(null);
    startTransition(async () => {
      try {
        await excluirLancamento(item.lancamentoId);
        onClose();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao excluir o lançamento.");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar lançamento"
      footer={
        <div className="flex items-center justify-between gap-2">
          {confirmandoExclusao ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-terra">Excluir mesmo?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirmandoExclusao(false)} disabled={pendente}>
                Não
              </Button>
              <Button variant="danger" size="sm" onClick={excluir} disabled={pendente}>
                Sim, excluir
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} strokeWidth={1.75} />}
              onClick={() => setConfirmandoExclusao(true)}
              disabled={pendente}
            >
              Excluir
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={pendente}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={salvar} disabled={pendente}>
              {pendente ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {erro && <p className="text-sm text-terra">{erro}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Fonte (cartão ou conta)
            <select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className={selectClass}>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {rotuloCartao(c)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor (R$)
            <Input type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Competência
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className={selectClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
            Fornecedor
            <Input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
            Descrição
            <Input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Categoria
            <select
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setSubcategoriaId("");
              }}
              className={selectClass}
            >
              <option value="">Selecionar</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Subcategoria (opcional)
            <select
              value={subcategoriaId}
              onChange={(e) => setSubcategoriaId(e.target.value)}
              disabled={subcategorias.length === 0}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="">Nenhuma</option>
              {subcategorias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Objetivo
            <select value={objetivoId} onChange={(e) => setObjetivoId(e.target.value)} className={selectClass}>
              <option value="">Selecionar</option>
              {objetivos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
            Contexto (opcional)
            <textarea
              rows={2}
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex.: aluguel de julho"
              className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
            />
          </label>
        </div>

        <p className="text-xs text-text-muted">
          Editar valor, data, competência, fornecedor, descrição ou fonte cria uma nova versão do lançamento — a original é
          preservada na auditoria (nunca é apagada). Mudar a competência move o lançamento de mês.
        </p>
      </div>
    </Modal>
  );
}
