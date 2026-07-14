import React from "react";

export interface CardHeaderProps {
  /** Uppercase title text. */
  title: string;
  /** Optional count shown right-aligned in mono (omit if `action` is set). */
  count?: string | number;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional trailing action node (e.g. a CardAction link / Button). */
  action?: React.ReactNode;
}

/** Uppercase header row for a Card. */
export function CardHeader(props: CardHeaderProps): JSX.Element;
