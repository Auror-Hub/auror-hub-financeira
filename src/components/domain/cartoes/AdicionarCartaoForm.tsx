"use client";

import { useRef, useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { criarCartao } from "@/lib/import/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AdicionarCartaoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoSubmeter(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await criarCartao(formData);
        formRef.current?.reset();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar cartão.");
      }
    });
  }

  return (
    <form ref={formRef} action={aoSubmeter} className="flex flex-col gap-3 rounded-card bg-surface-primary p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-text-muted" strokeWidth={1.75} />
        <span className="eyebrow">Adicionar cartão</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Instituição
          <Input name="instituicao" placeholder="Ex.: Banco Meridiano" required />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Apelido (opcional)
          <Input name="apelido" placeholder="Ex.: Meridiano Roxo" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Últimos 4 dígitos (opcional)
          <Input name="ultimos4" maxLength={4} placeholder="0000" />
        </label>
      </div>
      {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
      <Button type="submit" variant="primary" size="sm" disabled={pendente} className="w-fit">
        {pendente ? "Salvando..." : "Adicionar cartão"}
      </Button>
    </form>
  );
}
