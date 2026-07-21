"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";
import { NAV_ITEMS } from "./nav-items";

export function TopBar() {
  const pathname = usePathname();
  const session = useSession();
  const current = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

  return (
    <header className="flex h-[var(--topbar-height)] items-center justify-between border-b border-border-subtle bg-surface-primary px-4">
      <span className="text-lg font-semibold text-text-primary">
        {current?.label ?? "AURÓR · Hub Financeira"}
      </span>
      <div className="flex items-center gap-3">
        <span className="eyebrow">{session.profileName}</span>
        {/* Fase 7 (Auditoria V2): mantém text-xs — inicial única dentro de um avatar
            de 26px, dimensionado ao círculo, nunca lido como conteúdo textual. */}
        <div
          aria-hidden
          className="flex h-[26px] w-[26px] items-center justify-center rounded-avatar bg-slate-tint text-xs font-semibold text-slate"
        >
          {session.userName.charAt(0)}
        </div>
      </div>
    </header>
  );
}
