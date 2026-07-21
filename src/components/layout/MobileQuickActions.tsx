"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, X, PenLine } from "lucide-react";

/**
 * Rearquitetura (Fase 7, Auditoria V2): as ações globais da ActionBar
 * (Enviar documento, Captura rápida) somem abaixo de `sm` (ver AppShell.tsx)
 * e migram pra este botão flutuante — "Perguntar ao Consultor" não repete
 * aqui porque já é um destino da BottomNav.
 */
export function MobileQuickActions() {
  const [aberto, setAberto] = useState(false);

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end gap-2 sm:hidden"
      style={{ bottom: "calc(var(--actionbar-height) + 12px)" }}
    >
      {aberto && (
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/captura-rapida"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 rounded-pill bg-surface-primary px-3.5 py-2.5 text-sm font-medium text-text-primary shadow-[var(--shadow-popover)]"
          >
            <PenLine size={15} strokeWidth={1.75} />
            Captura rápida
          </Link>
          <Link
            href="/enviar"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2 rounded-pill bg-surface-primary px-3.5 py-2.5 text-sm font-medium text-text-primary shadow-[var(--shadow-popover)]"
          >
            <Upload size={15} strokeWidth={1.75} />
            Enviar documento
          </Link>
        </div>
      )}
      <button
        type="button"
        aria-label={aberto ? "Fechar ações rápidas" : "Ações rápidas"}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-action-primary text-action-on-primary shadow-[0_4px_16px_rgb(74_108_247_/_0.4)] transition-transform duration-150"
      >
        {aberto ? <X size={22} strokeWidth={1.75} /> : <Plus size={22} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
