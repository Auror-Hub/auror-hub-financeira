import { type ReactNode } from "react";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { ActionBar } from "./ActionBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-[var(--sidebar-width)_1fr] grid-rows-[var(--topbar-height)_1fr_var(--actionbar-height)] overflow-hidden">
      <NavRail />
      <TopBar />
      <main className="overflow-y-auto bg-page">
        <div className="mx-auto max-w-[var(--content-max)] px-6 py-6">{children}</div>
      </main>
      <div className="col-start-2">
        <ActionBar />
      </div>
    </div>
  );
}
