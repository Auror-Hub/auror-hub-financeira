"use client";

import { useState, useTransition } from "react";
import { Users, Copy, RefreshCw, Check, X } from "lucide-react";
import { aprovarMembro, recusarMembro, regenerarCodigoConvite } from "@/lib/familia/acoes";
import type { FamiliaDados } from "@/lib/familia/consulta";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface FamiliaSectionProps {
  familia: FamiliaDados;
}

const STATUS_LABEL: Record<FamiliaDados["membros"][number]["status"], string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  recusado: "Recusado",
};

export function FamiliaSection({ familia }: FamiliaSectionProps) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const pendencias = familia.membros.filter((m) => m.status === "pendente");

  function copiarCodigo() {
    navigator.clipboard.writeText(familia.codigoConvite).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function executar(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha na ação.");
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Família"
        count={familia.membros.filter((m) => m.status === "ativo").length}
        action={
          familia.souAdmin && pendencias.length > 0 ? (
            <Badge tone="gold">{pendencias.length} solicitação{pendencias.length > 1 ? "ões" : ""} pendente{pendencias.length > 1 ? "s" : ""}</Badge>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-text-muted" strokeWidth={1.75} />
          <span className="text-base font-medium text-text-primary">{familia.nome}</span>
        </div>

        {familia.souAdmin && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Código de convite:</span>
            <code className="rounded-input bg-surface-secondary px-2 py-0.5 font-mono-nums text-text-primary">{familia.codigoConvite}</code>
            <button type="button" onClick={copiarCodigo} className="text-text-muted hover:text-text-primary" title="Copiar código">
              {copiado ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => regenerarCodigoConvite())}
              className="text-text-muted hover:text-text-primary"
              title="Gerar novo código"
            >
              <RefreshCw size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}

        <ul className="flex flex-col divide-y divide-border-subtle">
          {familia.membros.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-base text-text-primary">{m.nome || m.email}</span>
                <span className="text-sm text-text-muted">
                  {m.papel === "admin" ? "Admin" : "Membro"} · {m.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={m.status === "ativo" ? "green" : m.status === "pendente" ? "gold" : "terra"}>{STATUS_LABEL[m.status]}</Badge>
                {familia.souAdmin && m.status === "pendente" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => executar(() => aprovarMembro(m.id))}
                      className="rounded-input p-1 text-green hover:bg-state-success-tint"
                      title="Aprovar"
                    >
                      <Check size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => executar(() => recusarMembro(m.id))}
                      className="rounded-input p-1 text-terra hover:bg-state-danger-tint"
                      title="Recusar"
                    >
                      <X size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {erro && <p className="rounded-card bg-state-danger-tint p-2.5 text-sm text-terra">{erro}</p>}
      </div>
    </Card>
  );
}
