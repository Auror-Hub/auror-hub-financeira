"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/**
 * Modal centralizado — ação pontual e bloqueante, sempre com saída clara
 * (fechamento/reabertura de competência). Distinto do Drawer (painel lateral
 * de detalhe): modal interrompe o fluxo para uma decisão, drawer só exibe
 * contexto adicional.
 */
export function Modal({ open, onClose, title, children, footer, width = 440 }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, open);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(28_25_22_/_0.28)] transition-opacity duration-150"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[85vh] flex-col rounded-card bg-surface-primary shadow-[var(--shadow-overlay)] outline-none"
        style={{ width }}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
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
