import { cn } from "@/lib/cn";

export type StatusDotTone = "ok" | "warn" | "risk" | "muted";

export interface StatusDotProps {
  tone: StatusDotTone;
  label?: string;
  className?: string;
}

const toneClasses: Record<StatusDotTone, string> = {
  ok: "text-state-success",
  warn: "text-state-warning",
  risk: "text-state-danger",
  muted: "text-text-muted",
};

export function StatusDot({ tone, label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-text-secondary", className)}>
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full bg-current", toneClasses[tone])}
      />
      {label}
    </span>
  );
}
