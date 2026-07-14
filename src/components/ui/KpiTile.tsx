import { cn } from "@/lib/cn";

export interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
  /** Tom aplicado ao valor. Padrão: texto primário neutro. */
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<KpiTileProps["tone"]>, string> = {
  default: "text-text-primary",
  success: "text-state-success",
  warning: "text-state-warning",
  danger: "text-state-danger",
};

export function KpiTile({ label, value, hint, tone = "default" }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-1 bg-surface-primary p-4">
      <span className="eyebrow">{label}</span>
      <span className={cn("font-mono-nums text-kpi font-bold tracking-tight", toneClasses[tone])}>
        {value}
      </span>
      {hint && <span className="text-sm text-text-muted">{hint}</span>}
    </div>
  );
}

export interface KpiStripProps {
  children: React.ReactNode;
}

export function KpiStrip({ children }: KpiStripProps) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-card bg-border-default shadow-[var(--shadow-card)]"
      style={{
        // auto-fit: encolhe para menos colunas em telas estreitas em vez de
        // espremer o valor até quebrar em várias linhas (tracks vazios
        // colapsam, os existentes se expandem para preencher a largura).
        gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
      }}
    >
      {children}
    </div>
  );
}
