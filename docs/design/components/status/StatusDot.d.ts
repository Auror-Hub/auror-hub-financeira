export interface StatusDotProps {
  /** ok=green, warn=gold, risk=terra, muted=grey. */
  tone: "ok" | "warn" | "risk" | "muted";
  /** Status text shown next to the dot. */
  label: string;
}

/** Small colored dot + label for inline status. */
export function StatusDot(props: StatusDotProps): JSX.Element;
