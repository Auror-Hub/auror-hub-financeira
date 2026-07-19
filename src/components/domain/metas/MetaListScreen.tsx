"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target } from "lucide-react";
import type { MetaComProgresso } from "@/lib/metas/consulta";
import { criarMeta, editarMeta, desativarMeta } from "@/lib/metas/acoes";
import { formatBRL } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const STATUS_TONE: Record<MetaComProgresso["status"], BadgeTone> = {
  ativa: "green",
  inativa: "slate",
};

const PROGRESSO_COR: Record<MetaComProgresso["statusProgresso"], string> = {
  ok: "bg-state-success",
  atencao: "bg-state-warning",
  estourada: "bg-state-danger",
};

const ROTULO_META_GERAL = "Orçamento geral (todas as categorias)";

export interface MetaListScreenProps {
  metas: MetaComProgresso[];
  categorias: { id: string; rotulo: string }[];
}

export function MetaListScreen({ metas, categorias }: MetaListScreenProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [metaEditando, setMetaEditando] = useState<MetaComProgresso | null>(null);

  const ativas = metas.filter((m) => m.status === "ativa");
  const inativas = metas.filter((m) => m.status === "inativa");
  const categoriasComMetaAtiva = new Set(ativas.map((m) => m.categoriaId).filter((id): id is string => id !== null));
  const jaTemMetaGeralAtiva = ativas.some((m) => m.categoriaId === null);

  function abrirNova() {
    setMetaEditando(null);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(meta: MetaComProgresso) {
    setMetaEditando(meta);
    setErro(null);
    setModalAberto(true);
  }

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        if (metaEditando) {
          await editarMeta(metaEditando.id, formData);
        } else {
          await criarMeta(formData);
        }
        setModalAberto(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar meta.");
      }
    });
  }

  function desativar(id: string) {
    setErro(null);
    startTransition(async () => {
      try {
        await desativarMeta(id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao desativar meta.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-text-muted" strokeWidth={1.75} />
          <h1 className="text-xl font-semibold text-text-primary">Metas</h1>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} strokeWidth={1.75} />} onClick={abrirNova}>
          Nova meta
        </Button>
      </div>
      <p className="text-sm text-text-muted">
        Teto de gasto recorrente por categoria (ou geral) — comparado com o gasto real da competência atual. Alerta na Home a
        partir de 80% do limite.
      </p>

      {erro && <ErrorState texto={erro} />}

      <div className="flex flex-col gap-3">
        {ativas.map((m) => (
          <MetaCard key={m.id} meta={m} pendente={pendente} onEditar={() => abrirEdicao(m)} onDesativar={() => desativar(m.id)} />
        ))}
        {ativas.length === 0 && (
          <EmptyState icon={Target} title="Nenhuma meta ativa ainda" description="Crie uma pra acompanhar planejado vs. realizado." />
        )}
      </div>

      {inativas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Histórico (inativas)</span>
          <div className="flex flex-col gap-2">
            {inativas.map((m) => (
              <MetaCard key={m.id} meta={m} pendente={pendente} />
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={metaEditando ? "Editar meta" : "Nova meta"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" disabled={pendente} form="form-meta" type="submit">
              {metaEditando ? "Salvar" : "Criar meta"}
            </Button>
          </div>
        }
      >
        <form id="form-meta" action={salvar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Categoria
            <select
              name="categoriaId"
              defaultValue={metaEditando?.categoriaId ?? ""}
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">{ROTULO_META_GERAL}</option>
              {categorias.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={categoriasComMetaAtiva.has(c.id) && metaEditando?.categoriaId !== c.id}
                >
                  {c.rotulo}
                </option>
              ))}
            </select>
            {!metaEditando && jaTemMetaGeralAtiva && (
              <span className="text-xs text-text-muted">Já existe um orçamento geral ativo — escolha uma categoria.</span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Limite (R$)
            <Input
              type="number"
              name="valorLimite"
              min="0.01"
              step="0.01"
              defaultValue={metaEditando ? (metaEditando.valorLimite / 100).toFixed(2) : ""}
              required
            />
          </label>
          {metaEditando && (
            <p className="text-xs text-text-muted">
              Salvar cria uma nova versão da meta — a atual (R$ {formatBRL(metaEditando.valorLimite)}) fica inativa no histórico.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function MetaCard({
  meta,
  pendente,
  onEditar,
  onDesativar,
}: {
  meta: MetaComProgresso;
  pendente: boolean;
  onEditar?: () => void;
  onDesativar?: () => void;
}) {
  const larguraBarra = Math.min(100, Math.round(meta.percentual * 100));

  return (
    <Card className={meta.status === "inativa" ? "opacity-60" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-base text-text-primary">{meta.categoriaRotulo}</span>
          <span className="font-mono-nums text-sm text-text-secondary">
            {formatBRL(meta.gastoAtual)} de {formatBRL(meta.valorLimite)} · {Math.round(meta.percentual * 100)}%
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={STATUS_TONE[meta.status]}>{meta.status}</Badge>
          {(onEditar || onDesativar) && (
            <div className="flex gap-1.5">
              {onEditar && (
                <Button variant="ghost" size="sm" disabled={pendente} onClick={onEditar}>
                  Editar
                </Button>
              )}
              {onDesativar && (
                <Button variant="ghost" size="sm" disabled={pendente} onClick={onDesativar}>
                  Desativar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-secondary">
        <div className={`h-full rounded-pill ${PROGRESSO_COR[meta.statusProgresso]}`} style={{ width: `${larguraBarra}%` }} />
      </div>
    </Card>
  );
}
