import React from "react";

export interface SignalProps {
  children: React.ReactNode;
  /** Color of the left accent bar. Default "indigo". */
  tone?: "indigo" | "green" | "terra" | "gold" | "slate";
  /** Mono metadata (e.g. timestamp) shown at the right. */
  meta?: string;
  onClick?: () => void;
}

/** Feed row with a colored left bar — used in the signals/sinais panel. */
export function Signal(props: SignalProps): JSX.Element;
