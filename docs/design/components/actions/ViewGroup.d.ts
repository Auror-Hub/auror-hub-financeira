export interface ViewGroupProps {
  /** Ordered view labels, e.g. ["quadro", "lista", "calendário"]. */
  views: string[];
  /** Currently active label (must be one of `views`). */
  active: string;
  /** Called with the newly selected label. */
  onChange?: (view: string) => void;
}

/** Segmented view switcher with monospace labels. */
export function ViewGroup(props: ViewGroupProps): JSX.Element;
