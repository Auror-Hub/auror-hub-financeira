"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { criarLancamentoManual } from "@/lib/lancamentos/manual";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface CartaoOpcao {
  id: string;
  instituicao: string;
  apelido: string | null;
}

export interface LancamentoManualFormProps {
  cartoes: CartaoOpcao[];
  categorias: { id: string; rotulo: string }[];
  subcategoriasPorCategoria: Record<string, { id: string; rotulo: string }[]>;
  objetivos: { id: string; rotulo: string }[];
}

export function LancamentoManualForm({ cartoes, categorias, subcategoriasPorCategoria, objetivos }: LancamentoManualFormProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");

  if (cartoes.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-2">
        <span className="eyebrow">Lançamento manual</span>
        <p className="text-base text-text-secondary">
          Cadastre pelo menos uma fonte (cartão ou conta) em Configurações antes de lançar uma despesa manual.
        </p>
      </Card>
    );
  }

  function enviar(formData: FormData) {
    setErro(null);
    setSucesso(false);
    startTransition(async () => {
      try {
        await criarLancamentoManual(formData);
        setSucesso(true);
        setCategoriaId("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gravar o lançamento.");
      }
    });
  }

  const subcategorias = subcategoriasPorCategoria[categoriaId] ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader title="Lançamento manual" />
      <p className="text-sm text-text-muted">
        Para despesas que nunca passam pelo cartão — aluguel, condomínio, contas de consumo, PIX. Diferente de uma
        fatura importada, aqui você já classifica na hora: o lançamento entra direto como decisão confirmada, sem
        passar pela Caixa de Entrada.
      </p>

      {erro && <p className="text-sm text-terra">{erro}</p>}
      {sucesso && <p className="text-sm text-state-success">Lançamento gravado com sucesso.</p>}

      <form action={enviar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Fonte (cartão ou conta)
          <select
            name="cartaoId"
            required
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apelido || c.instituicao}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Data
          <Input type="date" name="data" required />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
          Fornecedor
          <Input type="text" name="fornecedor" placeholder="Ex.: Imobiliária Central" required />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Valor (R$)
          <Input type="number" name="valor" min="0.01" step="0.01" placeholder="0,00" required />
        </label>

        <div />

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Categoria
          <select
            name="categoriaId"
            required
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
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
            name="subcategoriaId"
            disabled={subcategorias.length === 0}
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary disabled:opacity-50"
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
          <select
            name="objetivoId"
            required
            className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
          >
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
            name="contexto"
            rows={2}
            placeholder="Ex.: aluguel de julho"
            className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
          />
        </label>

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" size="sm" icon={<PenLine size={14} strokeWidth={1.75} />} disabled={pendente}>
            {pendente ? "Gravando..." : "Gravar lançamento"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
