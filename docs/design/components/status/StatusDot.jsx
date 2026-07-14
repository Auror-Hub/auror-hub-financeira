import React from "react";

/** StatusDot — colored dot + label for a status line. */
export function StatusDot({ tone = "muted", label }) {
  const toneClass = { ok: "ok", warn: "warn", risk: "risk", muted: "muted" }[tone] || "muted";
  return <span className={"status-dot " + toneClass}>{label}</span>;
}
