"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket } from "lucide-react";
import { cadastrarCestaBasica } from "@/lib/precos-externos/acoes";
import type { CestaBasicaRegistro } from "@/lib/precos-externos/consulta";
import { formatBRL, formatCompetencia } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/ErrorState";

export interface CestaBasicaSectionProps {
  registros: CestaBasicaRegistro[];
}

/**
 * Fase 12 (Auditoria V2): DIEESE não tem API pública estável — entrada
 * manual documentada como tal (nunca finge ser automática). Dado global,
 * compartilhado entre todas as famílias da Hub (mesmo espírito de
 * `taxonomia_termos`) — não é "cesta básica da minha família", é uma
 * referência econômica pública.
 */
export function CestaBasicaSection({ registros }: CestaBasicaSectionProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [capital, setCapital] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");

  function cadastrar() {
    setErro(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("capital", capital);
        formData.set("periodoReferencia", periodo);
        formData.set("valorCesta", valor);
        await cadastrarCestaBasica(formData);
        setCapital("");
        setPeriodo("");
        setValor("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao cadastrar a cesta básica.");
      }
    });
  }

  return (
    <Card>
      <CardHeader title="Cesta básica (DIEESE)" count={registros.length} />
      <p className="mb-3 text-sm text-text-muted">
        O DIEESE não publica uma API — o valor mensal por capital é colado aqui manualmente, a partir do{" "}
        <a href="https://www.dieese.org.br/cesta/" target="_blank" rel="noreferrer" className="text-action-primary hover:underline">
          levantamento público do DIEESE
        </a>
        . Referência compartilhada entre todas as famílias da Hub, não é dado desta família.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Capital
          <Input type="text" placeholder="Ex.: São Paulo" value={capital} onChange={(e) => setCapital(e.target.value)} className="h-[34px] w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Período (AAAA-MM)
          <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="h-[34px] w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Valor da cesta (R$)
          <Input type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="h-[34px] w-32" />
        </label>
        <Button variant="primary" size="sm" disabled={pendente} onClick={cadastrar} icon={<ShoppingBasket size={14} strokeWidth={1.75} />}>
          {pendente ? "Salvando..." : "Cadastrar"}
        </Button>
      </div>

      {erro && <ErrorState texto={erro} />}

      {registros.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border-subtle">
          {registros.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-text-primary">
                {r.capital} · {formatCompetencia(r.periodoReferencia)}
              </span>
              <span className="font-mono-nums text-text-secondary">{formatBRL(r.valorCesta)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
