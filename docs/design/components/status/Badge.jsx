import React from "react";

/** Badge — small pill label tinted by tone. */
export function Badge({ children, tone = "slate", icon }) {
  const toneClass = {
    slate: "badge-slate",
    indigo: "badge-indigo",
    green: "badge-green",
    gold: "badge-gold",
    terra: "badge-terra",
  }[tone] || "badge-slate";

  return (
    <span className={"badge " + toneClass}>
      {icon}
      {children}
    </span>
  );
}
