"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { editarCartao } from "@/lib/import/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface CartaoResumo {
  id: string;
  instituicao: string;
  apelido: string | null;
  tipo: "cartao" | "conta";
  ultimos_4_digitos: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
}

/**
 * Fase 15 (Auditoria V3.1): até aqui cartão só podia ser criado, nunca
 * editado — corrige o gap independente da auditoria (não dá pra corrigir um
 * apelido ou dígitos digitados errado). Ciclo (dia de fechamento/vencimento)
 * é opcional e só informativo por ora — nenhuma automação depende dele ainda.
 */
export function CartaoItem({ cartao }: { cartao: CartaoResumo }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!editando) {
    return (
      <li className="flex items-center justify-between py-2">
        <span className="text-base text-text-primary">{cartao.apelido || cartao.instituicao}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {cartao.tipo === "conta" ? "Conta" : "Cartão"} · {cartao.instituicao}
            {cartao.ultimos_4_digitos ? ` · •••• ${cartao.ultimos_4_digitos}` : ""}
            {cartao.dia_fechamento ? ` · fecha dia ${cartao.dia_fechamento}` : ""}
            {cartao.dia_vencimento ? ` · vence dia ${cartao.dia_vencimento}` : ""}
          </span>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-input p-1 text-text-muted hover:text-text-primary"
            aria-label="Editar cartão ou conta"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
        </div>
      </li>
    );
  }

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await editarCartao(cartao.id, formData);
        setEditando(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 py-2">
      <form action={salvar} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Instituição
          <Input name="instituicao" defaultValue={cartao.instituicao} required />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Apelido
          <Input name="apelido" defaultValue={cartao.apelido ?? ""} />
        </label>
        {cartao.tipo === "cartao" && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Últimos 4 dígitos
            <Input name="ultimos4" maxLength={4} defaultValue={cartao.ultimos_4_digitos ?? ""} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Dia de fechamento
          <Input name="diaFechamento" type="number" min="1" max="31" defaultValue={cartao.dia_fechamento ?? ""} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Dia de vencimento
          <Input name="diaVencimento" type="number" min="1" max="31" defaultValue={cartao.dia_vencimento ?? ""} />
        </label>
        <div className="col-span-full flex items-center gap-2">
          <Button type="submit" variant="primary" size="sm" disabled={pendente}>
            {pendente ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)} disabled={pendente}>
            Cancelar
          </Button>
        </div>
      </form>
      {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
    </li>
  );
}
