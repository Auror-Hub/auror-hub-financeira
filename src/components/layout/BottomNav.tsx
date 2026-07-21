"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

/**
 * Rearquitetura (Fase 7, Auditoria V2): shell fixo (rail+topbar+actionbar)
 * não tinha nenhuma adaptação por breakpoint — abaixo de `sm` o NavRail e a
 * ActionBar somem (ver AppShell.tsx) e esta barra assume a navegação
 * primária, mesmo padrão de app mobile nativo.
 */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const primarios = NAV_ITEMS.filter((item) => item.grupo === "primario");

  return (
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
    </nav>
  );
}
