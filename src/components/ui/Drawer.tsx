"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Largura do painel. Padrão 420px, conforme padrão de referência. */
  width?: number;
}

/**
 * Painel lateral (drawer) — sobrepõe a tela, nunca a substitui (regra da
 * arquitetura para SCR-TXN-DETAIL-001 e afins: nunca página cheia).
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 420 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(28_25_22_/_0.28)] transition-opacity duration-150"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full flex-col bg-surface-primary shadow-[var(--shadow-overlay)]",
          "animate-[drawer-in_var(--dur-slow)_var(--ease-settle)]",
        )}
        style={{ width }}
      >
        <div className="flex items-start justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex flex-col gap-0.5">
            {subtitle && <span className="eyebrow">{subtitle}</span>}
            <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-icon p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border-subtle px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
