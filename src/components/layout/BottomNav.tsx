"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";
import { Drawer } from "@/components/ui/Drawer";

/**
 * Rearquitetura (Fase 7, Auditoria V2): shell fixo (rail+topbar+actionbar)
 * não tinha nenhuma adaptação por breakpoint — abaixo de `sm` o NavRail e a
 * ActionBar somem (ver AppShell.tsx) e esta barra assume a navegação
 * primária, mesmo padrão de app mobile nativo. Fase 19 (Auditoria V3.1):
 * os 6 itens secundários (Competências, Categorias, Regras, Histórico,
 * Relatórios, Configurações) eram inacessíveis no mobile — o NavRail que os
 * abriga só renderiza a partir de `sm`. "Mais" abre um Drawer com eles.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const primarios = NAV_ITEMS.filter((item) => item.grupo === "primario");
  const secundarios = NAV_ITEMS.filter((item) => item.grupo === "secundario");
  const algumSecundarioAtivo = secundarios.some((item) => isActive(item.href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="flex h-[var(--actionbar-height)] items-stretch justify-around border-t border-border-subtle bg-surface-primary sm:hidden"
      >
        {primarios.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-action-primary" : "text-text-muted",
              )}
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMaisAberto(true)}
          aria-label="Mais opções"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
            algumSecundarioAtivo ? "text-action-primary" : "text-text-muted",
          )}
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
          <span className="truncate px-0.5">Mais</span>
        </button>
      </nav>

      <Drawer open={maisAberto} onClose={() => setMaisAberto(false)} title="Mais" width={320}>
        <div className="flex flex-col gap-1">
          {secundarios.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMaisAberto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-card px-3 py-2.5 text-base font-medium",
                  active ? "bg-surface-secondary text-action-primary" : "text-text-primary",
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
