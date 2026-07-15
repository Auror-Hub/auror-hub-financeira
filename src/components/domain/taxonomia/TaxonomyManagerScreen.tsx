"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, RotateCcw, Tags, X } from "lucide-react";
import type { TermoGerenciavel } from "@/lib/taxonomia/consulta";
import { criarTermo, editarRotulo, desativarTermo, reativarTermo } from "@/lib/taxonomia/acoes";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface TaxonomyManagerScreenProps {
  termos: TermoGerenciavel[];
}

function TermoRow({ termo, onSalvo }: { termo: TermoGerenciavel; onSalvo: () => void }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [rotulo, setRotulo] = useState(termo.rotulo);
  const [erro, setErro] = useState<string | null>(null);

  function executar(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
        onSalvo();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-2">
        {editando ? (
          <div className="flex flex-1 items-center gap-1.5">
            <Input value={rotulo} onChange={(e) => setRotulo(e.target.value)} className="h-8" />
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(async () => { await editarRotulo(termo.id, rotulo); setEditando(false); })}
              className="text-state-success"
              aria-label="Salvar"
            >
              <Check size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => {
                setRotulo(termo.rotulo);
                setEditando(false);
              }}
              className="text-text-muted"
              aria-label="Cancelar"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <span className={termo.status === "desativado" ? "text-text-muted line-through" : "text-base text-text-primary"}>
            {termo.rotulo}
          </span>
        )}
        {!editando && (
          <div className="flex items-center gap-2">
            {termo.status !== "ativo" && <Badge tone="slate">{termo.status}</Badge>}
            <button type="button" onClick={() => setEditando(true)} className="text-text-muted hover:text-text-primary" aria-label="Editar">
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            {termo.status === "desativado" ? (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => reativarTermo(termo.id))}
                className="text-text-muted hover:text-text-primary"
                aria-label="Reativar"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
              </button>
            ) : (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => desativarTermo(termo.id))}
                className="text-text-muted hover:text-terra"
                aria-label="Desativar"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>
      {erro && <p className="text-sm text-terra">{erro}</p>}
    </li>
  );
}

function AddTermoForm({ dimensao, termoPaiId }: { dimensao: "categoria" | "subcategoria" | "objetivo"; termoPaiId?: string }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [rotulo, setRotulo] = useState("");

  function adicionar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await criarTermo(formData);
        setRotulo("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao criar termo.");
      }
    });
  }

  return (
    <form action={adicionar} className="flex items-center gap-2 pt-2">
      <input type="hidden" name="dimensao" value={dimensao} />
      {termoPaiId && <input type="hidden" name="termoPaiId" value={termoPaiId} />}
      <Input
        name="rotulo"
        placeholder={dimensao === "categoria" ? "Nova categoria" : dimensao === "objetivo" ? "Novo objetivo" : "Nova subcategoria"}
        required
        value={rotulo}
        onChange={(e) => setRotulo(e.target.value)}
        className="h-8 flex-1"
      />
      <Button type="submit" variant="secondary" size="sm" icon={<Plus size={13} strokeWidth={1.75} />} disabled={pendente}>
        Adicionar
      </Button>
      {erro && <p className="text-sm text-terra">{erro}</p>}
    </form>
  );
}

export function TaxonomyManagerScreen({ termos }: TaxonomyManagerScreenProps) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");

  const categorias = useMemo(() => termos.filter((t) => t.dimensao === "categoria"), [termos]);
  const objetivos = useMemo(() => termos.filter((t) => t.dimensao === "objetivo"), [termos]);
  const categoriaAtual = categoriaSelecionada || categorias.find((c) => c.status === "ativo")?.id || categorias[0]?.id || "";
  const subcategorias = useMemo(
    () => termos.filter((t) => t.dimensao === "subcategoria" && t.termoPaiId === categoriaAtual),
    [termos, categoriaAtual],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Tags size={20} className="text-text-muted" strokeWidth={1.75} />
        <h1 className="text-xl font-semibold text-text-primary">Taxonomia</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Categorias" count={categorias.length} />
          <ul className="flex flex-col divide-y divide-border-subtle">
            {categorias.map((t) => (
              <TermoRow key={t.id} termo={t} onSalvo={() => {}} />
            ))}
          </ul>
          <AddTermoForm dimensao="categoria" />
        </Card>

        <Card>
          <CardHeader title="Objetivos" count={objetivos.length} />
          <ul className="flex flex-col divide-y divide-border-subtle">
            {objetivos.map((t) => (
              <TermoRow key={t.id} termo={t} onSalvo={() => {}} />
            ))}
          </ul>
          <AddTermoForm dimensao="objetivo" />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Subcategorias" count={subcategorias.length} />
          <label className="mb-2 flex flex-col gap-1 text-sm text-text-secondary">
            Categoria
            <select
              value={categoriaAtual}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="h-[34px] w-fit rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </label>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {subcategorias.map((t) => (
              <TermoRow key={t.id} termo={t} onSalvo={() => {}} />
            ))}
            {subcategorias.length === 0 && <li className="py-2 text-base text-text-muted">Nenhuma subcategoria ainda.</li>}
          </ul>
          {categoriaAtual && <AddTermoForm dimensao="subcategoria" termoPaiId={categoriaAtual} />}
        </Card>
      </div>
    </div>
  );
}
