import React from "react";

export interface KpiTileProps {
  /** Mono uppercase micro-label. */
  label: string;
  /** Big value (string or node). */
  value: React.ReactNode;
  /** Optional sub-hint line below the value. */
  hint?: string;
  /** Tint the value with a layer color. */
  color?: "indigo" | "green" | "gold" | "terra" | "slate";
}

/** Single KPI cell — use inside a KpiStrip. */
export function KpiTile(props: KpiTileProps): JSX.Element;
