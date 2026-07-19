import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "success";
}

/**
 * Rearquitetura (Fase 0, ADR-007): estado global de "nada aqui" — antes cada
 * tela escrevia o próprio bloco à mão (mesma marcação repetida em Inbox,
 * Metas etc.). Adotado progressivamente, não é preciso migrar tudo de uma vez.
 */
export function EmptyState({ icon: Icon, title, description, action, tone = "neutral" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface-primary p-10 text-center shadow-[var(--shadow-card)]">
      <Icon size={28} className={tone === "success" ? "text-state-success" : "text-text-muted"} strokeWidth={1.5} />
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {description && <p className="max-w-md text-base text-text-secondary">{description}</p>}
      {action}
    </div>
  );
}
