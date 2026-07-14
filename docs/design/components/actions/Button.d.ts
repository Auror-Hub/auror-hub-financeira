import React from "react";

export interface ButtonProps {
  /** Button label / content. */
  children: React.ReactNode;
  /** Visual variant mapped to the ecosystem palette. Default "secondary". */
  variant?: "primary" | "success" | "danger" | "secondary" | "ghost";
  /** Height/density. Default "md" (32px); "sm" is 26px. */
  size?: "sm" | "md";
  /** Optional leading icon node (e.g. a Lucide <i data-lucide>). */
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * Primary action control for the Ecossistema.
 * @startingPoint section="Actions" subtitle="Five-variant button on the ecosystem palette" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
