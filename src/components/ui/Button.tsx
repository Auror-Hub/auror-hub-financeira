import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "success" | "danger" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action-primary text-action-on-primary hover:bg-action-primary-hover shadow-[0_2px_8px_rgb(74_108_247_/_0.3)]",
  success: "bg-state-success text-white hover:brightness-110",
  danger: "bg-state-danger text-white hover:brightness-110",
  secondary:
    "bg-surface-secondary text-text-primary border border-border-default hover:bg-hover",
  ghost: "bg-transparent text-text-primary hover:bg-surface-secondary",
};

const sizeClasses: Record<ButtonSize, string> = {
  // Rearquitetura (Fase 7, Auditoria V2): 26px ficava abaixo de alvo de toque
  // confortável (~32px mínimo) — usado em quase toda ação secundária do app.
  sm: "h-[32px] rounded-btn-sm px-2.5 text-sm gap-1",
  md: "h-8 rounded-btn px-3.5 text-base gap-1.5",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
