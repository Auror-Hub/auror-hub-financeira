import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "slate" | "indigo" | "green" | "gold" | "terra";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  slate: "bg-state-neutral-tint text-slate",
  indigo: "bg-indigo-tint text-indigo",
  green: "bg-state-success-tint text-green",
  gold: "bg-state-warning-tint text-gold",
  terra: "bg-state-danger-tint text-terra",
};

export function Badge({ children, tone = "slate", icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-sm font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
