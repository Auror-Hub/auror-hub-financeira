import React from "react";

/** KpiStrip — a 4-up grid container for KpiTile cells. */
export function KpiStrip({ children, columns = 4 }) {
  return (
    <div
      className="eco-kpi-strip"
      style={columns !== 4 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {children}
    </div>
  );
}
