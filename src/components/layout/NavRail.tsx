"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

function NavLink({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "flex h-[34px] w-[34px] items-center justify-center rounded-icon transition-colors duration-150",
        active ? "bg-indigo-tint text-action-primary" : "text-text-muted hover:bg-surface-secondary hover:text-text-primary",
      )}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span className="sr-only">{item.label}</span>
    </Link>
  );
}

export function NavRail() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const primarios = NAV_ITEMS.filter((item) => item.grupo === "primario");
  const secundarios = NAV_ITEMS.filter((item) => item.grupo === "secundario");

  return (
    <nav
      aria-label="Navegação principal"
      className="row-span-3 flex w-[var(--sidebar-width)] flex-col items-center gap-1 border-r border-border-subtle bg-surface-primary py-2"
    >
      <div
        aria-hidden
        className="mb-2 h-[30px] w-[30px] rounded-icon bg-action-primary shadow-[0_2px_8px_rgb(74_108_247_/_0.25)]"
      />
      {primarios.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} />
      ))}
      <div aria-hidden className="my-1.5 h-px w-[24px] bg-border-subtle" />
      {secundarios.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} />
      ))}
    </nav>
  );
}
