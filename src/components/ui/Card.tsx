import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * Barra de acento à esquerda. Aceita apenas as cinco cores da paleta —
   * nunca nomes de produto/módulo (ver docs/design, seção 2 do design doc).
   */
  accent?: "indigo" | "green" | "gold" | "terra" | "slate";
}

const accentClasses: Record<NonNullable<CardProps["accent"]>, string> = {
  indigo: "border-l-2 border-l-indigo",
  green: "border-l-2 border-l-green",
  gold: "border-l-2 border-l-gold",
  terra: "border-l-2 border-l-terra",
  slate: "border-l-2 border-l-slate",
};

export function Card({ children, className, accent }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface-primary p-4 shadow-[var(--shadow-card)]",
        accent && accentClasses[accent],
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  count?: number | string;
  action?: ReactNode;
}

export function CardHeader({ title, count, action }: CardHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="eyebrow">{title}</span>
        {/* Fase 7 (Auditoria V2): mantém text-xs — contador pareado ao título
            eyebrow (mesmo tamanho, mesma hierarquia visual secundária). */}
        {count !== undefined && (
          <span className="font-mono-nums text-xs text-text-muted">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}
