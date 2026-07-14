"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
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
        <div className="relative hidden max-w-[260px] flex-1 sm:block">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder"
          />
          <input
            type="search"
            disabled
            placeholder="Buscar (Etapa 2)"
            title="Busca global chega junto com os dados reais, na Etapa 2"
            className="h-[30px] w-full rounded-input border border-border-subtle bg-surface-secondary pl-8 pr-3 text-sm text-text-muted placeholder:text-text-placeholder outline-none"
          />
        </div>
        <span className="eyebrow">{session.profileName}</span>
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
