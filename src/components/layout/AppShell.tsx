import { type ReactNode } from "react";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { ActionBar } from "./ActionBar";
import { BottomNav } from "./BottomNav";
import { MobileQuickActions } from "./MobileQuickActions";

/**
 * Rearquitetura (Fase 7, Auditoria V2): abaixo de `sm` (640px) o rail lateral
 * e a action bar somem — a navegação primária passa pra BottomNav e as
 * ações globais pro botão flutuante de MobileQuickActions. Acima de `sm`,
 * layout idêntico ao anterior.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[var(--topbar-height)_1fr_var(--actionbar-height)] overflow-hidden sm:grid-cols-[var(--sidebar-width)_1fr]">
      <NavRail />
      <TopBar />
      <main className="overflow-y-auto bg-page">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-6 sm:px-6">{children}</div>
      </main>
      <div className="hidden sm:col-start-2 sm:block">
        <ActionBar />
      </div>
      <BottomNav />
      <MobileQuickActions />
    </div>
  );
}
