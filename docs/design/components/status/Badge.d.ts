import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  /** Tint. Default "slate". */
  tone?: "slate" | "indigo" | "green" | "gold" | "terra";
  icon?: React.ReactNode;
}

/**
 * Tinted pill label.
 * @startingPoint section="Status" subtitle="Tinted pill labels across the palette" viewport="700x150"
 */
export function Badge(props: BadgeProps): JSX.Element;
