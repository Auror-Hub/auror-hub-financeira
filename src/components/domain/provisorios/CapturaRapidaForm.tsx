"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { criarProvisorio } from "@/lib/provisorios/acoes";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface CapturaRapidaFormProps {
  categorias: { id: string; rotulo: string }[];
  objetivos: { id: string; rotulo: string }[];
}

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Rearquitetura (Fase 3, ADR-007): captura rápida — mobile-first, propositalmente
 * mínima (poucos campos obrigatórios). Grava uma intenção de gasto
 * (`lancamentos_provisorios`), nunca um lançamento real — aparece na Caixa de
 * Entrada aguardando conciliação com o fato bancário quando ele chegar.
 */
export function CapturaRapidaForm({ categorias, objetivos }: CapturaRapidaFormProps) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [key, setKey] = useState(0);

  function enviar(formData: FormData) {
    setErro(null);
    setSucesso(false);
    startTransition(async () => {
      try {
        await criarProvisorio(formData);
        setSucesso(true);
        setKey((k) => k + 1);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao registrar o gasto.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <CardHeader title="Captura rápida" />
        <p className="text-sm text-text-muted">
          Anote um gasto que você sabe que aconteceu, mesmo sem ver ainda no extrato ou fatura — ele fica aguardando
          conciliação na Caixa de Entrada até o lançamento real chegar.
        </p>

        {erro && <p className="text-sm text-terra">{erro}</p>}
        {sucesso && (
          <p className="text-sm text-state-success">
            Registrado — ele aparece na{" "}
            <Link href="/caixa-de-entrada" className="underline">
              Caixa de Entrada
            </Link>{" "}
            aguardando conciliação.
          </p>
        )}

        <form key={key} action={enviar} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            O que foi?
            <Input type="text" name="descricaoUsuario" placeholder="Ex.: Almoço com a Malu" required />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Valor (R$)
            <Input type="number" name="valor" min="0.01" step="0.01" placeholder="0,00" required />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Data
            <Input type="date" name="dataOcorrencia" defaultValue={hojeIso()} required />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Fornecedor (opcional — ajuda a achar o lançamento depois)
            <Input type="text" name="fornecedorDica" placeholder="Ex.: Restaurante Sabor" />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Categoria (opcional — já classifica quando conciliar)
            <select
              name="categoriaDica"
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Não sei ainda</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Objetivo (opcional)
            <select
              name="objetivoDica"
              className="h-[34px] rounded-input border border-border-default bg-surface-primary px-2 text-base text-text-primary"
            >
              <option value="">Não sei ainda</option>
              {objetivos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Contexto (opcional)
            <textarea
              name="contexto"
              rows={2}
              placeholder="Algo que ajude a lembrar depois"
              className="rounded-input border border-border-default bg-surface-primary p-2.5 text-base text-text-primary placeholder:text-text-placeholder"
            />
          </label>

          <Button type="submit" variant="primary" icon={<PenLine size={14} strokeWidth={1.75} />} disabled={pendente}>
            {pendente ? "Registrando..." : "Registrar gasto"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
