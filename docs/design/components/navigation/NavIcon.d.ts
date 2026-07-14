import React from "react";

export interface NavIconProps {
  /** Icon node (e.g. a Lucide <i data-lucide="…" />). */
  icon: React.ReactNode;
  active?: boolean;
  /** Activity orb in the corner, tinted by layer. */
  orb?: "indigo" | "green" | "gold";
  /** Tooltip / accessible title. */
  title?: string;
  onClick?: () => void;
}

/** Icon button for the left navigation rail. */
export function NavIcon(props: NavIconProps): JSX.Element;
