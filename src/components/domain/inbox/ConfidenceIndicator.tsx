import { cn } from "@/lib/cn";

export interface ConfidenceIndicatorProps {
  /** 0–1 */
  valor: number;
  label?: string;
  compact?: boolean;
}

function faixa(valor: number): { rotulo: string; cor: string; barra: string } {
  if (valor >= 0.85) return { rotulo: "Alta", cor: "text-state-success", barra: "bg-state-success" };
  if (valor >= 0.6) return { rotulo: "Média", cor: "text-state-warning", barra: "bg-state-warning" };
  return { rotulo: "Baixa", cor: "text-state-danger", barra: "bg-state-danger" };
}

/** Indicador de confiança da proposta de IA — nunca usado para fato ou decisão. */
export function ConfidenceIndicator({ valor, label, compact = false }: ConfidenceIndicatorProps) {
  const { rotulo, cor, barra } = faixa(valor);
  const pct = Math.round(valor * 100);

  if (compact) {
    return (
      <span className={cn("font-mono-nums text-sm font-medium", cor)}>
        {pct}% <span className="text-text-muted">· {rotulo}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label ?? "Confiança"}</span>
        <span className={cn("font-mono-nums font-medium", cor)}>
          {pct}% · {rotulo}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-secondary">
        <div className={cn("h-full rounded-pill transition-all duration-300", barra)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
