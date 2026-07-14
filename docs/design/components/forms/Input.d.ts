import React from "react";

export interface InputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Single-line text input with indigo focus ring.
 * @startingPoint section="Forms" subtitle="Text input with indigo focus ring" viewport="700x150"
 */
export function Input(props: InputProps): JSX.Element;
