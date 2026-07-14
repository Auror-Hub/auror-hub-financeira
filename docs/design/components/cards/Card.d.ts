import React from "react";

export interface CardProps {
  children: React.ReactNode;
  /** Coloured left-border tying the card to an ecosystem layer. */
  layer?: "madan" | "auror" | "aurora" | "eco" | "risk" | null;
  className?: string;
  /** Enable the hover lift + deeper shadow. Default true. */
  hoverable?: boolean;
  style?: React.CSSProperties;
}

/**
 * Brand surface container with soft layered shadow.
 * @startingPoint section="Cards" subtitle="Surface container with optional layer accent" viewport="700x150"
 */
export function Card(props: CardProps): JSX.Element;
