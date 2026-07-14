import React from "react";

export interface KpiStripProps {
  /** A row of <KpiTile> elements. */
  children: React.ReactNode;
  /** Number of columns. Default 4. */
  columns?: number;
}

/** Hairline-separated KPI grid container. */
export function KpiStrip(props: KpiStripProps): JSX.Element;
