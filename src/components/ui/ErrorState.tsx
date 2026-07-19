import { CircleAlert } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  texto: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Rearquitetura (Fase 0, ADR-007): estado global de erro — cor + ícone + texto
 * (nunca só cor), com retentativa opcional. Substitui os `<p className="text-terra">`
 * soltos espalhados pelas telas de ação (Inbox, Metas, edição de lançamento...).
 */
export function ErrorState({ texto, onRetry, retryLabel = "Tentar de novo" }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-state-danger-tint p-3 text-sm text-terra">
      <span className="flex items-center gap-2">
        <CircleAlert size={16} className="shrink-0" strokeWidth={1.75} />
        {texto}
      </span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
