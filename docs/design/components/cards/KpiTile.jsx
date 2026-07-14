import React from "react";

/** KpiTile — a single metric cell. Value can be tinted by layer color. */
export function KpiTile({ label, value, hint, color }) {
  const colorVar = {
    indigo: "var(--indigo)",
    green: "var(--green)",
    gold: "var(--gold)",
    terra: "var(--terra)",
    slate: "var(--slate)",
  }[color];

  return (
    <div className="eco-kpi">
      <div className="eco-kpi-label">{label}</div>
      <div className="eco-kpi-value" style={colorVar ? { color: colorVar } : undefined}>
        {value}
      </div>
      {hint ? <div className="eco-kpi-hint">{hint}</div> : null}
    </div>
  );
}
